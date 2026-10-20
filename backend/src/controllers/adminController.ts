import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '../config/db.js';
import { logger } from '../services/loggerService.js';
import { config } from '../config/env.js';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2),
  role: z.enum(['student', 'faculty', 'admin']),
  department: z.string().optional(),
  student_id_number: z.string().optional(),
});

export class AdminController {
  /**
   * Get Platform Overview Statistics
   */
  static async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();

      const userStats = await db.query(`
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as total_students,
          SUM(CASE WHEN role = 'faculty' THEN 1 ELSE 0 END) as total_faculty,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as total_admins,
          SUM(CASE WHEN is_active = 1 OR is_active = true THEN 1 ELSE 0 END) as active_users
        FROM users
      `);

      const assignmentStats = await db.query(`
        SELECT 
          COUNT(*) as total_assignments,
          SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_assignments,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_assignments,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_assignments
        FROM assignments
      `);

      const submissionStats = await db.query(`
        SELECT 
          COUNT(*) as total_submissions,
          SUM(CASE WHEN status = 'graded' THEN 1 ELSE 0 END) as graded_submissions,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_submissions,
          SUM(file_size_bytes) as total_storage_bytes
        FROM submissions
      `);

      const recentActivity = await db.query(`
        SELECT id, action, details, created_at, ip_address
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        stats: {
          users: userStats.rows[0],
          assignments: assignmentStats.rows[0],
          submissions: submissionStats.rows[0],
          aws_info: {
            s3_bucket: config.aws.s3Bucket,
            region: config.aws.region,
            storage_mode: config.aws.useLocalStorage ? 'Local Fallback' : 'Amazon S3',
            cloudwatch_status: config.cloudwatch.enabled ? 'Active' : 'Disabled (Local Logging)',
            db_engine: db.type === 'postgres' ? 'Amazon RDS PostgreSQL' : 'SQLite (Local Engine)',
          },
          recentActivity: recentActivity.rows,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * List all users with search, filtering, and pagination
   */
  static async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const { role, status, search } = req.query;

      let query = `
        SELECT id, email, full_name, role, department, student_id_number, is_active, created_at
        FROM users
        WHERE 1=1
      `;
      const params: any[] = [];
      let pIdx = 1;

      if (role) {
        query += ` AND role = $${pIdx++}`;
        params.push(role);
      }

      if (status !== undefined && status !== '') {
        const isActive = status === 'active' ? 1 : 0;
        query += ` AND (is_active = $${pIdx++} OR is_active = ${status === 'active' ? 'true' : 'false'})`;
        params.push(isActive);
      }

      if (search) {
        query += ` AND (email LIKE $${pIdx} OR full_name LIKE $${pIdx} OR student_id_number LIKE $${pIdx})`;
        params.push(`%${search}%`);
        pIdx++;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await db.query(query, params);
      res.json({ success: true, count: result.rowCount, users: result.rows });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create an account (e.g. Faculty or Student) from Admin panel
   */
  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createUserSchema.parse(req.body);
      const db = getDb();

      const existing = await db.query('SELECT id FROM users WHERE email = $1', [data.email.toLowerCase().trim()]);
      if (existing.rowCount > 0) {
        res.status(409).json({ success: false, message: 'User with this email already exists.' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(data.password, salt);

      await db.query(
        `INSERT INTO users (email, password_hash, full_name, role, department, student_id_number, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, 1)`,
        [
          data.email.toLowerCase().trim(),
          passwordHash,
          data.full_name.trim(),
          data.role,
          data.department || null,
          data.student_id_number || null,
        ]
      );

      await logger.info(`Admin created account: ${data.email} as ${data.role}`);

      res.status(201).json({ success: true, message: `Account created for ${data.full_name} (${data.role}).` });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Toggle user active status (Disable / Enable account)
   */
  static async toggleUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      const adminUser = req.user!;
      const db = getDb();

      const targetId = Array.isArray(id) ? id[0] : id;
      if (parseInt(targetId, 10) === adminUser.id) {
        res.status(400).json({ success: false, message: 'You cannot disable your own administrator account.' });
        return;
      }

      const activeVal = is_active ? 1 : 0;
      await db.query('UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [activeVal, id]);

      await logger.info(`Admin ${adminUser.email} changed active status of user ${id} to ${is_active}`);

      res.json({
        success: true,
        message: `User account has been ${is_active ? 'activated' : 'deactivated'}.`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all submissions across system for admin oversight
   */
  static async listAllSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const query = `
        SELECT 
          s.id, s.file_key, s.file_name, s.file_size_bytes, s.status, s.submitted_at,
          s.marks_awarded, s.faculty_feedback, s.grade_status, s.graded_at,
          u.full_name as student_name, u.email as student_email, u.student_id_number,
          a.id as assignment_id, a.title as assignment_title, a.course_code, a.max_marks,
          f.full_name as faculty_name
        FROM submissions s
        JOIN users u ON s.student_id = u.id
        JOIN assignments a ON s.assignment_id = a.id
        JOIN users f ON a.faculty_id = f.id
        ORDER BY s.submitted_at DESC
      `;
      const result = await db.query(query);
      res.json({ success: true, count: result.rowCount, submissions: result.rows });
    } catch (err) {
      next(err);
    }
  }
}
