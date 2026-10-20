import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import path from 'path';
import { getDb } from '../config/db.js';
import { S3Service } from '../services/s3Service.js';
import { logger } from '../services/loggerService.js';
import { EmailService } from '../services/emailService.js';

const gradeSubmissionSchema = z.object({
  marks_awarded: z.coerce.number().min(0, 'Marks cannot be negative'),
  faculty_feedback: z.string().optional(),
  grade_status: z.enum(['draft', 'published']).default('published'),
});

export class SubmissionController {
  /**
   * Submit an assignment file (Student only)
   */
  static async submitAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assignmentId } = req.params;
      const user = req.user!;
      const db = getDb();

      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded.' });
        return;
      }

      // 1. Fetch assignment details
      const assignRes = await db.query(
        'SELECT * FROM assignments WHERE id = $1',
        [assignmentId]
      );

      if (assignRes.rowCount === 0) {
        res.status(404).json({ success: false, message: 'Assignment not found.' });
        return;
      }

      const assignment = assignRes.rows[0];

      if (assignment.status === 'draft') {
        res.status(403).json({ success: false, message: 'This assignment is not currently open for submissions.' });
        return;
      }

      // Check file size against assignment limit
      const maxBytes = (assignment.max_file_size_mb || 25) * 1024 * 1024;
      if (req.file.size > maxBytes) {
        res.status(400).json({
          success: false,
          message: `Uploaded file (${(req.file.size / 1024 / 1024).toFixed(1)}MB) exceeds assignment limit of ${assignment.max_file_size_mb}MB.`,
        });
        return;
      }

      // Check file extension against allowed types
      const allowedExts = (assignment.allowed_file_types || 'pdf,docx,zip')
        .split(',')
        .map((e: string) => e.trim().toLowerCase().replace('.', ''));
      
      const fileExt = path.extname(req.file.originalname).toLowerCase().replace('.', '');
      if (allowedExts.length > 0 && !allowedExts.includes(fileExt)) {
        res.status(400).json({
          success: false,
          message: `File extension '.${fileExt}' is not permitted. Allowed: ${allowedExts.join(', ')}`,
        });
        return;
      }

      // Check if late
      const now = new Date();
      const dueDate = new Date(assignment.due_date);
      const isLate = now > dueDate;
      const submissionStatus = isLate ? 'late' : 'submitted';

      // Upload file to Amazon S3 key: submissions/{assignmentId}/{studentId}/{timestamp}-{filename}
      const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const s3Key = `submissions/${assignmentId}/${user.id}/${Date.now()}-${sanitizedName}`;
      
      const uploadResult = await S3Service.uploadFile(
        req.file.buffer,
        s3Key,
        req.file.mimetype
      );

      // Check if student already submitted (update or insert)
      const existingSub = await db.query(
        'SELECT id, file_key FROM submissions WHERE assignment_id = $1 AND student_id = $2',
        [assignmentId, user.id]
      );

      if (existingSub.rowCount > 0) {
        // Old file clean up
        const oldKey = existingSub.rows[0].file_key;
        if (oldKey && oldKey !== s3Key) {
          await S3Service.deleteFile(oldKey);
        }

        await db.query(
          `UPDATE submissions 
           SET file_key = $1, file_name = $2, file_size_bytes = $3, file_type = $4,
               submission_url = $5, status = $6, submitted_at = CURRENT_TIMESTAMP
           WHERE id = $7`,
          [
            uploadResult.key,
            req.file.originalname,
            req.file.size,
            req.file.mimetype,
            uploadResult.url,
            submissionStatus,
            existingSub.rows[0].id,
          ]
        );
      } else {
        await db.query(
          `INSERT INTO submissions (
            assignment_id, student_id, file_key, file_name, file_size_bytes,
            file_type, submission_url, status, submitted_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
          [
            assignmentId,
            user.id,
            uploadResult.key,
            req.file.originalname,
            req.file.size,
            req.file.mimetype,
            uploadResult.url,
            submissionStatus,
          ]
        );
      }

      await logger.info(
        `Student ${user.email} submitted file '${req.file.originalname}' for assignment '${assignment.title}' (Status: ${submissionStatus})`
      );

      res.status(201).json({
        success: true,
        message: isLate
          ? 'Assignment submitted successfully (Marked Late as deadline passed).'
          : 'Assignment submitted successfully on time!',
        status: submissionStatus,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all submissions for a student (Student only)
   */
  static async getStudentSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const db = getDb();

      const query = `
        SELECT 
          s.id, s.assignment_id, s.file_key, s.file_name, s.file_size_bytes,
          s.file_type, s.status, s.submitted_at, s.grade_status,
          CASE WHEN s.grade_status = 'published' THEN s.marks_awarded ELSE NULL END as marks_awarded,
          CASE WHEN s.grade_status = 'published' THEN s.faculty_feedback ELSE NULL END as faculty_feedback,
          CASE WHEN s.grade_status = 'published' THEN s.graded_at ELSE NULL END as graded_at,
          a.title as assignment_title, a.course_code, a.course_name, a.due_date, a.max_marks,
          u.full_name as faculty_name
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        LEFT JOIN users u ON a.faculty_id = u.id
        WHERE s.student_id = $1
        ORDER BY s.submitted_at DESC
      `;

      const result = await db.query(query, [user.id]);

      const submissions = await Promise.all(
        result.rows.map(async (sub: any) => {
          let download_url = null;
          if (sub.file_key) {
            download_url = await S3Service.getDownloadUrl(sub.file_key);
          }
          return {
            ...sub,
            download_url,
          };
        })
      );

      res.json({ success: true, count: submissions.length, submissions });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get submissions for an assignment (Faculty owner or Admin)
   */
  static async getAssignmentSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assignmentId } = req.params;
      const user = req.user!;
      const db = getDb();

      // Check ownership
      const assignRes = await db.query(
        'SELECT id, title, faculty_id, max_marks FROM assignments WHERE id = $1',
        [assignmentId]
      );

      if (assignRes.rowCount === 0) {
        res.status(404).json({ success: false, message: 'Assignment not found.' });
        return;
      }

      const assignment = assignRes.rows[0];
      if (user.role === 'faculty' && assignment.faculty_id !== user.id) {
        res.status(403).json({ success: false, message: 'Access denied. You can only view submissions for your own assignments.' });
        return;
      }

      const query = `
        SELECT 
          s.*,
          u.full_name as student_name, u.email as student_email,
          u.student_id_number, u.department as student_department,
          g.full_name as grader_name
        FROM submissions s
        JOIN users u ON s.student_id = u.id
        LEFT JOIN users g ON s.graded_by = g.id
        WHERE s.assignment_id = $1
        ORDER BY s.submitted_at DESC
      `;

      const result = await db.query(query, [assignmentId]);

      const submissions = await Promise.all(
        result.rows.map(async (sub: any) => {
          let download_url = null;
          if (sub.file_key) {
            download_url = await S3Service.getDownloadUrl(sub.file_key);
          }
          return {
            ...sub,
            download_url,
          };
        })
      );

      res.json({
        success: true,
        assignment: {
          id: assignment.id,
          title: assignment.title,
          max_marks: assignment.max_marks,
        },
        count: submissions.length,
        submissions,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Grade a submission (Faculty owner or Admin)
   */
  static async gradeSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { submissionId } = req.params;
      const data = gradeSubmissionSchema.parse(req.body);
      const user = req.user!;
      const db = getDb();

      // Find submission and check assignment ownership
      const subRes = await db.query(
        `SELECT s.id, s.assignment_id, s.student_id, a.faculty_id, a.max_marks, a.title as assignment_title, u.email as student_email
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN users u ON s.student_id = u.id
         WHERE s.id = $1`,
        [submissionId]
      );

      if (subRes.rowCount === 0) {
        res.status(404).json({ success: false, message: 'Submission not found.' });
        return;
      }

      const sub = subRes.rows[0];

      if (user.role === 'faculty' && sub.faculty_id !== user.id) {
        res.status(403).json({ success: false, message: 'Access denied. You can only grade submissions for your assignments.' });
        return;
      }

      if (data.marks_awarded > sub.max_marks) {
        res.status(400).json({
          success: false,
          message: `Marks awarded (${data.marks_awarded}) cannot exceed maximum assignment marks (${sub.max_marks}).`,
        });
        return;
      }

      const newStatus = 'graded';

      await db.query(
        `UPDATE submissions
         SET marks_awarded = $1, faculty_feedback = $2, graded_by = $3,
             graded_at = CURRENT_TIMESTAMP, grade_status = $4, status = $5
         WHERE id = $6`,
        [data.marks_awarded, data.faculty_feedback || null, user.id, data.grade_status, newStatus, submissionId]
      );

      // Trigger Email Notification: Marks Released
      if (data.grade_status === 'published') {
        EmailService.notifyMarksReleased(parseInt(submissionId as string, 10)).catch((err) =>
          console.error('Failed to dispatch marks released email:', err)
        );
      }

      await logger.info(
        `Submission ${submissionId} graded by ${user.email}: ${data.marks_awarded}/${sub.max_marks} (Status: ${data.grade_status})`
      );

      res.json({
        success: true,
        message: data.grade_status === 'published' ? 'Grade and feedback published to student.' : 'Grade saved as draft.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get secure download URL for a submission (Student for own, Faculty/Admin for all)
   */
  static async getDownloadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { submissionId } = req.params;
      const user = req.user!;
      const db = getDb();

      const subRes = await db.query(
        `SELECT s.id, s.student_id, s.file_key, s.file_name, a.faculty_id 
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         WHERE s.id = $1`,
        [submissionId]
      );

      if (subRes.rowCount === 0) {
        res.status(404).json({ success: false, message: 'Submission not found.' });
        return;
      }

      const sub = subRes.rows[0];

      if (user.role === 'student' && sub.student_id !== user.id) {
        res.status(403).json({ success: false, message: 'Access denied. You can only download your own submissions.' });
        return;
      }

      if (user.role === 'faculty' && sub.faculty_id !== user.id) {
        res.status(403).json({ success: false, message: 'Access denied. You can only download submissions for your assignments.' });
        return;
      }

      const downloadUrl = await S3Service.getDownloadUrl(sub.file_key, 3600);

      res.json({
        success: true,
        downloadUrl,
        fileName: sub.file_name,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Faculty/Admin: Reveal or hide marks for a specific submission
   */
  static async revealSubmissionMark(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { submissionId } = req.params;
      const { grade_status } = req.body;
      const user = req.user!;
      const db = getDb();

      const newStatus = grade_status === 'published' ? 'published' : 'draft';

      const subRes = await db.query(
        `SELECT s.id, s.assignment_id, s.marks_awarded, a.faculty_id, a.title as assignment_title, u.full_name as student_name
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN users u ON s.student_id = u.id
         WHERE s.id = $1`,
        [submissionId]
      );

      if (subRes.rowCount === 0) {
        res.status(404).json({ success: false, message: 'Submission not found.' });
        return;
      }

      const sub = subRes.rows[0];

      if (user.role === 'faculty' && sub.faculty_id !== user.id) {
        res.status(403).json({ success: false, message: 'Access denied. You can only manage marks for your assignments.' });
        return;
      }

      await db.query(
        `UPDATE submissions SET grade_status = $1 WHERE id = $2`,
        [newStatus, submissionId]
      );

      // Trigger Email Notification: Marks Released
      if (newStatus === 'published' && sub.marks_awarded !== null) {
        EmailService.notifyMarksReleased(parseInt(submissionId as string, 10)).catch((err) =>
          console.error('Failed to dispatch marks released email:', err)
        );
      }

      await logger.info(
        `Faculty ${user.email} set mark visibility for submission #${submissionId} (${sub.student_name}) to '${newStatus}'`
      );

      res.json({
        success: true,
        message: newStatus === 'published'
          ? `Marks revealed to student (${sub.student_name}).`
          : `Marks hidden from student (saved as draft).`,
        grade_status: newStatus,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Faculty/Admin: Reveal ALL graded marks for an assignment to students in bulk
   */
  static async revealAllAssignmentMarks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assignmentId } = req.params;
      const user = req.user!;
      const db = getDb();

      const assignRes = await db.query(
        `SELECT id, title, faculty_id FROM assignments WHERE id = $1`,
        [assignmentId]
      );

      if (assignRes.rowCount === 0) {
        res.status(404).json({ success: false, message: 'Assignment not found.' });
        return;
      }

      const assign = assignRes.rows[0];
      if (user.role === 'faculty' && assign.faculty_id !== user.id) {
        res.status(403).json({ success: false, message: 'Access denied. You can only publish grades for your assignments.' });
        return;
      }

      const updateRes = await db.query(
        `UPDATE submissions 
         SET grade_status = 'published'
         WHERE assignment_id = $1 AND marks_awarded IS NOT NULL`,
        [assignmentId]
      );

      // Trigger Email Notifications: Marks Released for all updated submissions
      const subsToNotify = await db.query(
        `SELECT id FROM submissions WHERE assignment_id = $1 AND marks_awarded IS NOT NULL`,
        [assignmentId]
      );
      for (const s of subsToNotify.rows) {
        EmailService.notifyMarksReleased(s.id).catch(console.error);
      }

      await logger.info(
        `Faculty ${user.email} revealed all marks for assignment '${assign.title}' (Count: ${updateRes.rowCount})`
      );

      res.json({
        success: true,
        message: `Successfully revealed marks for all graded submissions in '${assign.title}'. Notification emails dispatched.`,
        revealed_count: updateRes.rowCount,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Faculty/Admin: Hide all marks for an assignment in bulk (set to draft)
   */
  static async hideAllAssignmentMarks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assignmentId } = req.params;
      const user = req.user!;
      const db = getDb();

      const assignRes = await db.query(
        `SELECT id, title, faculty_id FROM assignments WHERE id = $1`,
        [assignmentId]
      );

      if (assignRes.rowCount === 0) {
        res.status(404).json({ success: false, message: 'Assignment not found.' });
        return;
      }

      const assign = assignRes.rows[0];
      if (user.role === 'faculty' && assign.faculty_id !== user.id) {
        res.status(403).json({ success: false, message: 'Access denied.' });
        return;
      }

      const updateRes = await db.query(
        `UPDATE submissions 
         SET grade_status = 'draft'
         WHERE assignment_id = $1`,
        [assignmentId]
      );

      await logger.info(
        `Faculty ${user.email} hid all marks for assignment '${assign.title}' (Count: ${updateRes.rowCount})`
      );

      res.json({
        success: true,
        message: `All marks for '${assign.title}' hidden from students.`,
        hidden_count: updateRes.rowCount,
      });
    } catch (err) {
      next(err);
    }
  }
}
