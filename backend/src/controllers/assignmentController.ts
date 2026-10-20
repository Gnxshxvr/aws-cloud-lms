import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getDb } from '../config/db.js';
import { S3Service } from '../services/s3Service.js';
import { logger } from '../services/loggerService.js';
import { EmailService } from '../services/emailService.js';

const createAssignmentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  course_code: z.string().min(2, 'Course code is required'),
  course_name: z.string().min(3, 'Course name is required'),
  due_date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid due date format' }),
  max_marks: z.coerce.number().min(1).default(100),
  allowed_file_types: z.string().default('pdf,docx,zip'),
  max_file_size_mb: z.coerce.number().min(1).max(100).default(25),
  status: z.enum(['draft', 'published', 'closed']).default('published'),
});

const updateAssignmentSchema = createAssignmentSchema.partial();

export class AssignmentController {
  /**
   * List assignments based on role:
   * - Students: only published or closed assignments, with student's submission status attached
   * - Faculty: their own assignments (draft, published, closed) with submission stats
   * - Admin: all assignments in the system
   */
  static async listAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const user = req.user!;
      const { course, status, search } = req.query;

      let query = `
        SELECT 
          a.id, a.title, a.description, a.course_code, a.course_name, 
          a.due_date, a.max_marks, a.allowed_file_types, a.max_file_size_mb,
          a.status, a.reference_file_key, a.reference_file_name, a.created_at,
          u.full_name as faculty_name, u.email as faculty_email,
          COUNT(DISTINCT s.id) as total_submissions
      `;

      if (user.role === 'student') {
        query += `,
          MAX(CASE WHEN s.student_id = ${user.id} THEN s.id ELSE NULL END) as my_submission_id,
          MAX(CASE WHEN s.student_id = ${user.id} THEN s.status ELSE NULL END) as my_submission_status,
          MAX(CASE WHEN s.student_id = ${user.id} THEN s.submitted_at ELSE NULL END) as my_submitted_at,
          MAX(CASE WHEN s.student_id = ${user.id} THEN s.grade_status ELSE NULL END) as my_grade_status,
          MAX(CASE WHEN s.student_id = ${user.id} AND s.grade_status = 'published' THEN s.marks_awarded ELSE NULL END) as my_marks_awarded
        `;
      }

      query += `
        FROM assignments a
        JOIN users u ON a.faculty_id = u.id
        LEFT JOIN submissions s ON a.id = s.assignment_id
        WHERE 1=1
      `;

      const params: any[] = [];
      let pIdx = 1;

      if (user.role === 'student') {
        // Students can only see published or closed assignments
        query += ` AND a.status IN ('published', 'closed')`;
      } else if (user.role === 'faculty') {
        // Faculty can see only their own assignments by default unless querying as admin
        query += ` AND a.faculty_id = $${pIdx++}`;
        params.push(user.id);
      }

      if (course) {
        query += ` AND (a.course_code = $${pIdx} OR a.course_name LIKE $${pIdx})`;
        params.push(`%${course}%`);
        pIdx++;
      }

      if (status) {
        query += ` AND a.status = $${pIdx++}`;
        params.push(status);
      }

      if (search) {
        query += ` AND (a.title LIKE $${pIdx} OR a.description LIKE $${pIdx} OR a.course_code LIKE $${pIdx})`;
        params.push(`%${search}%`);
        pIdx++;
      }

      query += ` GROUP BY a.id, a.title, a.description, a.course_code, a.course_name, a.due_date, a.max_marks, a.allowed_file_types, a.max_file_size_mb, a.status, a.reference_file_key, a.reference_file_name, a.created_at, u.full_name, u.email ORDER BY a.due_date ASC`;

      const result = await db.query(query, params);

      // Enhance reference file URLs with presigned download links
      const assignments = await Promise.all(
        result.rows.map(async (assign: any) => {
          let reference_download_url = null;
          if (assign.reference_file_key) {
            reference_download_url = await S3Service.getDownloadUrl(assign.reference_file_key);
          }
          return {
            ...assign,
            reference_download_url,
            is_overdue: new Date(assign.due_date) < new Date() && assign.status === 'published',
          };
        })
      );

      res.json({ success: true, count: assignments.length, assignments });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single assignment by ID with full details
   */
  static async getAssignmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const { id } = req.params;
      const user = req.user!;

      const query = `
        SELECT 
          a.*,
          u.full_name as faculty_name, u.email as faculty_email, u.department as faculty_department
        FROM assignments a
        JOIN users u ON a.faculty_id = u.id
        WHERE a.id = $1
      `;
      const result = await db.query(query, [id]);

      if (result.rowCount === 0) {
        res.status(404).json({ success: false, message: 'Assignment not found.' });
        return;
      }

      const assignment = result.rows[0];

      // If student, check if it's draft (forbidden)
      if (user.role === 'student' && assignment.status === 'draft') {
        res.status(403).json({ success: false, message: 'This assignment is not yet published.' });
        return;
      }

      // If faculty, check ownership unless admin
      if (user.role === 'faculty' && assignment.faculty_id !== user.id) {
        res.status(403).json({ success: false, message: 'Access denied to assignments created by other faculty.' });
        return;
      }

      // Reference file URL
      let reference_download_url = null;
      if (assignment.reference_file_key) {
        reference_download_url = await S3Service.getDownloadUrl(assignment.reference_file_key);
      }

      // Check student submission
      let studentSubmission = null;
      if (user.role === 'student') {
        const subRes = await db.query(
          'SELECT * FROM submissions WHERE assignment_id = $1 AND student_id = $2 ORDER BY submitted_at DESC LIMIT 1',
          [id, user.id]
        );
        if (subRes.rowCount > 0) {
          const sub = subRes.rows[0];
          let subDownloadUrl = null;
          if (sub.file_key) {
            subDownloadUrl = await S3Service.getDownloadUrl(sub.file_key);
          }
          studentSubmission = {
            ...sub,
            download_url: subDownloadUrl,
            // Only reveal grade if published
            marks_awarded: sub.grade_status === 'published' ? sub.marks_awarded : null,
            faculty_feedback: sub.grade_status === 'published' ? sub.faculty_feedback : null,
          };
        }
      }

      res.json({
        success: true,
        assignment: {
          ...assignment,
          reference_download_url,
          is_overdue: new Date(assignment.due_date) < new Date(),
          my_submission: studentSubmission,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create assignment (Faculty only)
   */
  static async createAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createAssignmentSchema.parse(req.body);
      const user = req.user!;
      const db = getDb();

      let referenceFileKey: string | null = null;
      let referenceFileName: string | null = null;

      // Handle optional reference file attachment
      if (req.file) {
        const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const s3Key = `assignments/${data.course_code.toUpperCase()}/${Date.now()}-${sanitizedName}`;
        const uploadRes = await S3Service.uploadFile(req.file.buffer, s3Key, req.file.mimetype);
        referenceFileKey = uploadRes.key;
        referenceFileName = req.file.originalname;
      }

      const insertQuery = `
        INSERT INTO assignments (
          title, description, course_code, course_name, faculty_id,
          due_date, max_marks, allowed_file_types, max_file_size_mb,
          status, reference_file_key, reference_file_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `;

      const insertRes = await db.query(insertQuery, [
        data.title,
        data.description,
        data.course_code.toUpperCase(),
        data.course_name,
        user.id,
        data.due_date,
        data.max_marks,
        data.allowed_file_types,
        data.max_file_size_mb,
        data.status,
        referenceFileKey,
        referenceFileName,
      ]);

      const newAssignmentId = insertRes.rows[0]?.id;

      // Trigger Email Notification: Assignment Once Assigned
      if (newAssignmentId && data.status === 'published') {
        EmailService.notifyAssignmentAssigned(newAssignmentId).catch((err) =>
          console.error('Failed to dispatch new assignment email:', err)
        );
      }

      await logger.info(`Assignment created: ${data.title} (${data.course_code}) by faculty ${user.email}`);

      res.status(201).json({
        success: true,
        message: 'Assignment created successfully and notification emails triggered to enrolled students.',
        assignment_id: newAssignmentId,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update assignment (Faculty owner or Admin)
   */
  static async updateAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateAssignmentSchema.parse(req.body);
      const user = req.user!;
      const db = getDb();

      const existingRes = await db.query('SELECT faculty_id, reference_file_key FROM assignments WHERE id = $1', [id]);
      if (existingRes.rowCount === 0) {
        res.status(404).json({ success: false, message: 'Assignment not found.' });
        return;
      }

      const existing = existingRes.rows[0];
      if (user.role === 'faculty' && existing.faculty_id !== user.id) {
        res.status(403).json({ success: false, message: 'You can only edit assignments you created.' });
        return;
      }

      let referenceFileKey = existing.reference_file_key;
      let referenceFileName = undefined;

      if (req.file) {
        const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const s3Key = `assignments/${id}/${Date.now()}-${sanitizedName}`;
        const uploadRes = await S3Service.uploadFile(req.file.buffer, s3Key, req.file.mimetype);
        referenceFileKey = uploadRes.key;
        referenceFileName = req.file.originalname;
      }

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (data.title !== undefined) { updates.push(`title = $${idx++}`); values.push(data.title); }
      if (data.description !== undefined) { updates.push(`description = $${idx++}`); values.push(data.description); }
      if (data.course_code !== undefined) { updates.push(`course_code = $${idx++}`); values.push(data.course_code.toUpperCase()); }
      if (data.course_name !== undefined) { updates.push(`course_name = $${idx++}`); values.push(data.course_name); }
      if (data.due_date !== undefined) { updates.push(`due_date = $${idx++}`); values.push(data.due_date); }
      if (data.max_marks !== undefined) { updates.push(`max_marks = $${idx++}`); values.push(data.max_marks); }
      if (data.allowed_file_types !== undefined) { updates.push(`allowed_file_types = $${idx++}`); values.push(data.allowed_file_types); }
      if (data.max_file_size_mb !== undefined) { updates.push(`max_file_size_mb = $${idx++}`); values.push(data.max_file_size_mb); }
      if (data.status !== undefined) { updates.push(`status = $${idx++}`); values.push(data.status); }
      if (referenceFileKey !== existing.reference_file_key) {
        updates.push(`reference_file_key = $${idx++}`); values.push(referenceFileKey);
        updates.push(`reference_file_name = $${idx++}`); values.push(referenceFileName);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(id);
      await db.query(`UPDATE assignments SET ${updates.join(', ')} WHERE id = $${idx}`, values);

      res.json({ success: true, message: 'Assignment updated successfully.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete assignment (Faculty owner or Admin)
   */
  static async deleteAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;
      const db = getDb();

      const existingRes = await db.query('SELECT faculty_id, reference_file_key FROM assignments WHERE id = $1', [id]);
      if (existingRes.rowCount === 0) {
        res.status(404).json({ success: false, message: 'Assignment not found.' });
        return;
      }

      if (user.role === 'faculty' && existingRes.rows[0].faculty_id !== user.id) {
        res.status(403).json({ success: false, message: 'Unauthorized to delete this assignment.' });
        return;
      }

      // Check if submissions exist
      const subRes = await db.query('SELECT COUNT(*) as count FROM submissions WHERE assignment_id = $1', [id]);
      const count = parseInt(subRes.rows[0].count, 10);
      if (count > 0 && user.role !== 'admin') {
        res.status(400).json({
          success: false,
          message: `Cannot delete assignment because it already has ${count} student submission(s). You can change its status to 'closed' instead.`,
        });
        return;
      }

      // Delete reference file if exists
      if (existingRes.rows[0].reference_file_key) {
        await S3Service.deleteFile(existingRes.rows[0].reference_file_key);
      }

      await db.query('DELETE FROM submissions WHERE assignment_id = $1', [id]);
      await db.query('DELETE FROM assignments WHERE id = $1', [id]);

      await logger.info(`Assignment ${id} deleted by ${user.email}`);

      res.json({ success: true, message: 'Assignment deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Faculty/Admin: Trigger 24-hour deadline reminder emails to students who haven't submitted yet
   */
  static async send24hReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const count = await EmailService.notify24hDeadlineReminder(parseInt(id, 10));

      res.json({
        success: true,
        message: `Dispatched 24-hour deadline reminder emails to ${count} students with pending deliverables.`,
        sent_count: count,
      });
    } catch (err) {
      next(err);
    }
  }
}
