import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import { getDb } from '../config/db.js';
import { logger } from '../services/loggerService.js';

const createCourseSchema = z.object({
  course_code: z.string().min(2, 'Course code is required (e.g. CS-101)'),
  course_name: z.string().min(3, 'Course name is required'),
  department: z.string().default('Computer Science'),
  description: z.string().optional().default(''),
});

const FIRST_NAMES = [
  'Liam', 'Noah', 'Oliver', 'James', 'Elijah', 'William', 'Henry', 'Lucas', 'Benjamin', 'Theodore',
  'Mateo', 'Levi', 'Sebastian', 'Daniel', 'Jack', 'Alexander', 'Owen', 'Asher', 'Samuel', 'Ethan',
  'Olivia', 'Emma', 'Charlotte', 'Amelia', 'Sophia', 'Isabella', 'Ava', 'Mia', 'Evelyn', 'Luna',
  'Harper', 'Camila', 'Sofia', 'Scarlett', 'Elizabeth', 'Eleanor', 'Emily', 'Chloe', 'Mila', 'Violet'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
];

export class CourseController {
  /**
   * List courses:
   * - Faculty: list courses they manage (or all with query param)
   * - Student: list all available courses with enrollment status
   * - Admin: all courses
   */
  static async listCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const user = req.user!;

      let query = `
        SELECT 
          c.id, c.course_code, c.course_name, c.department, c.description, c.created_at,
          u.full_name as faculty_name, u.email as faculty_email,
          COUNT(DISTINCT ce.student_id) as enrolled_students_count,
          COUNT(DISTINCT a.id) as assignments_count
        FROM courses c
        LEFT JOIN users u ON c.faculty_id = u.id
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
        LEFT JOIN assignments a ON c.course_code = a.course_code
      `;

      const params: any[] = [];
      if (user.role === 'faculty') {
        query += ` WHERE c.faculty_id = $1`;
        params.push(user.id);
      }

      query += ` GROUP BY c.id, c.course_code, c.course_name, c.department, c.description, c.created_at, u.full_name, u.email ORDER BY c.course_code ASC`;

      const result = await db.query(query, params);
      res.json({ success: true, count: result.rows.length, courses: result.rows });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single course details with roster and assignments
   */
  static async getCourseById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const { id } = req.params;

      const courseRes = await db.query(
        `SELECT c.*, u.full_name as faculty_name, u.email as faculty_email
         FROM courses c
         LEFT JOIN users u ON c.faculty_id = u.id
         WHERE c.id = $1`,
        [id]
      );

      if (courseRes.rowCount === 0) {
        res.status(404).json({ success: false, message: 'Course not found.' });
        return;
      }

      const course = courseRes.rows[0];

      // Get enrolled students
      const rosterRes = await db.query(
        `SELECT u.id, u.full_name, u.email, u.student_id_number, u.department, ce.enrolled_at,
                COUNT(s.id) as submission_count
         FROM course_enrollments ce
         JOIN users u ON ce.student_id = u.id
         LEFT JOIN assignments a ON a.course_code = $1
         LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = u.id
         WHERE ce.course_id = $2
         GROUP BY u.id, u.full_name, u.email, u.student_id_number, u.department, ce.enrolled_at
         ORDER BY u.full_name ASC`,
        [course.course_code, id]
      );

      // Get assignments
      const assignRes = await db.query(
        `SELECT a.*, COUNT(s.id) as total_submissions
         FROM assignments a
         LEFT JOIN submissions s ON a.id = s.assignment_id
         WHERE a.course_code = $1
         GROUP BY a.id
         ORDER BY a.due_date ASC`,
        [course.course_code]
      );

      res.json({
        success: true,
        course,
        roster: rosterRes.rows,
        assignments: assignRes.rows,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create a new course (Faculty or Admin)
   */
  static async createCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const user = req.user!;
      const data = createCourseSchema.parse(req.body);

      // Check unique course code
      const existing = await db.query(
        `SELECT id FROM courses WHERE course_code = $1`,
        [data.course_code.trim().toUpperCase()]
      );

      if (existing.rowCount > 0) {
        res.status(400).json({ success: false, message: `Course code ${data.course_code} already exists.` });
        return;
      }

      const insertRes = await db.query(
        `INSERT INTO courses (course_code, course_name, department, description, faculty_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          data.course_code.trim().toUpperCase(),
          data.course_name.trim(),
          data.department.trim(),
          data.description?.trim() || '',
          user.id,
        ]
      );

      await logger.info(`Faculty ${user.email} created new course: ${data.course_code} - ${data.course_name}`);

      res.status(201).json({
        success: true,
        message: 'Course created successfully.',
        course: insertRes.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Add a random pool of 30 students to a course by Faculty
   */
  static async generate30Students(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const user = req.user!;
      const { id } = req.params;
      const isPg = db.type === 'postgres';

      // Verify course ownership
      const courseRes = await db.query(
        `SELECT id, course_code, course_name, faculty_id, department FROM courses WHERE id = $1`,
        [id]
      );

      if (courseRes.rowCount === 0) {
        res.status(404).json({ success: false, message: 'Course not found.' });
        return;
      }

      const course = courseRes.rows[0];

      if (user.role === 'faculty' && course.faculty_id !== user.id) {
        res.status(403).json({ success: false, message: 'Access denied. You can only manage your own courses.' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const studentPasswordHash = await bcrypt.hash('StudentPassword123!', salt);

      // Shuffle and pick 30 unique names
      const generatedStudents: any[] = [];
      const usedNames = new Set<string>();

      let count = 0;
      let seed = Date.now() % 10000;

      while (count < 30) {
        const first = FIRST_NAMES[(count * 3 + seed) % FIRST_NAMES.length];
        const last = LAST_NAMES[(count * 7 + seed) % LAST_NAMES.length];
        const fullName = `${first} ${last}`;
        
        if (!usedNames.has(fullName)) {
          usedNames.add(fullName);
          const studentNum = 100 + count + (seed % 800);
          const studentIdNum = `STU-2026-${studentNum.toString().padStart(3, '0')}`;
          const email = `stu.${first.toLowerCase()}.${last.toLowerCase()}${studentNum}@portal.edu`;

          generatedStudents.push({
            full_name: fullName,
            email,
            student_id_number: studentIdNum,
            department: course.department || 'Computer Science',
          });
          count++;
        } else {
          seed += 1;
        }
      }

      // Insert students into users & enroll into course_enrollments
      const enrolledUserIds: number[] = [];

      for (const s of generatedStudents) {
        let studentUserId: number;

        const existingUser = await db.query(`SELECT id FROM users WHERE email = $1`, [s.email]);

        if (existingUser.rowCount > 0) {
          studentUserId = existingUser.rows[0].id;
        } else {
          const insertUserRes = await db.query(
            `INSERT INTO users (email, password_hash, full_name, role, department, student_id_number, is_active)
             VALUES ($1, $2, $3, 'student', $4, $5, 1)
             RETURNING id`,
            [s.email, studentPasswordHash, s.full_name, s.department, s.student_id_number]
          );
          studentUserId = insertUserRes.rows[0].id;
        }

        enrolledUserIds.push(studentUserId);

        const enrollSql = isPg
          ? `INSERT INTO course_enrollments (course_id, student_id) VALUES ($1, $2) ON CONFLICT (course_id, student_id) DO NOTHING`
          : `INSERT OR IGNORE INTO course_enrollments (course_id, student_id) VALUES ($1, $2)`;
        await db.query(enrollSql, [course.id, studentUserId]);
      }

      // Check if this course has active assignments; generate realistic submissions
      const assignRes = await db.query(
        `SELECT id, title, max_marks, due_date FROM assignments WHERE course_code = $1`,
        [course.course_code]
      );

      let createdSubmissionsCount = 0;
      if (assignRes.rowCount > 0) {
        const assignment = assignRes.rows[0];
        const maxMarks = assignment.max_marks || 100;

        // Generate submissions for 25 out of the 30 students (5 remain pending submission)
        for (let i = 0; i < enrolledUserIds.length; i++) {
          const sId = enrolledUserIds[i];

          // Check if submission already exists
          const existingSub = await db.query(
            `SELECT id FROM submissions WHERE assignment_id = $1 AND student_id = $2`,
            [assignment.id, sId]
          );

          if (existingSub.rowCount === 0 && i < 25) {
            const isLate = i >= 20; // 5 late submissions
            const status = i < 15 ? 'graded' : (isLate ? 'late' : 'submitted');
            const submittedAt = new Date(Date.now() - (i + 1) * 3600 * 1000 * 4).toISOString();
            
            // Grades: some draft, some published
            let marksAwarded: number | null = null;
            let feedback: string | null = null;
            let gradeStatus: string = 'draft';
            let gradedAt: string | null = null;
            let gradedBy: number | null = null;

            if (status === 'graded') {
              marksAwarded = Math.round(maxMarks * (0.7 + (i % 6) * 0.05) * 2) / 2; // e.g. 70% - 95%
              gradeStatus = i % 2 === 0 ? 'published' : 'draft'; // 50% draft, 50% published
              gradedAt = new Date().toISOString();
              gradedBy = course.faculty_id;
              feedback = `Solid technical deliverable. Well-organized architecture documentation with sound methodology. Review rubric section 3.`;
            }

            const fileName = `Deliverable_${course.course_code}_${generatedStudents[i].full_name.replace(/\s+/g, '_')}.pdf`;
            const fileKey = `submissions/${assignment.id}/${sId}/${fileName}`;

            await db.query(
              `INSERT INTO submissions (
                assignment_id, student_id, file_key, file_name, file_size_bytes, file_type,
                submission_url, status, submitted_at, marks_awarded, faculty_feedback,
                graded_by, graded_at, grade_status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
              [
                assignment.id,
                sId,
                fileKey,
                fileName,
                512000 + (i * 24000), // ~500KB - 1.2MB
                'application/pdf',
                `/uploads/${fileName}`,
                status,
                submittedAt,
                marksAwarded,
                feedback,
                gradedBy,
                gradedAt,
                gradeStatus,
              ]
            );
            createdSubmissionsCount++;
          }
        }
      }

      await logger.info(
        `Faculty ${user.email} generated 30 random students and ${createdSubmissionsCount} submissions for course ${course.course_code}`
      );

      res.status(201).json({
        success: true,
        message: `Successfully generated and enrolled 30 students into ${course.course_code}: ${course.course_name}!`,
        course_code: course.course_code,
        students_count: 30,
        submissions_generated: createdSubmissionsCount,
        sample_students: generatedStudents.slice(0, 5),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Import students from Excel/CSV file or JSON payload into a course
   * A student can belong to multiple courses
   */
  static async importRoster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const user = req.user!;
      const { id } = req.params;
      const isPg = db.type === 'postgres';

      // Verify course
      const courseRes = await db.query(
        `SELECT id, course_code, course_name, faculty_id, department FROM courses WHERE id = $1`,
        [id]
      );

      if (courseRes.rowCount === 0) {
        res.status(404).json({ success: false, message: 'Course not found.' });
        return;
      }

      const course = courseRes.rows[0];

      if (user.role === 'faculty' && course.faculty_id !== user.id) {
        res.status(403).json({ success: false, message: 'Access denied. You can only import rosters for your own courses.' });
        return;
      }

      let parsedRows: Array<{ name: string; email: string; student_id_number?: string }> = [];

      // Case 1: Excel / CSV file uploaded via multer (req.file)
      if (req.file) {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rawSheetData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        for (const row of rawSheetData) {
          const keys = Object.keys(row);
          // Find name column
          const nameKey = keys.find((k) =>
            /^(name|full[\s_-]?name|student[\s_-]?name|first[\s_-]?name)$/i.test(k.trim())
          );
          // Find email column
          const emailKey = keys.find((k) =>
            /^(email|mail|email[\s_-]?id|mail[\s_-]?id|institutional[\s_-]?email)$/i.test(k.trim())
          );
          // Find optional student ID column
          const idKey = keys.find((k) =>
            /^(student[\s_-]?id|id|roll[\s_-]?no|reg[\s_-]?no)$/i.test(k.trim())
          );

          const name = nameKey ? String(row[nameKey]).trim() : '';
          const email = emailKey ? String(row[emailKey]).trim().toLowerCase() : '';
          const student_id_number = idKey ? String(row[idKey]).trim() : undefined;

          if (name && email && email.includes('@')) {
            parsedRows.push({ name, email, student_id_number });
          }
        }
      } else if (req.body.students) {
        // Case 2: JSON payload of students array
        let rawList: any[] = [];
        if (typeof req.body.students === 'string') {
          try {
            rawList = JSON.parse(req.body.students);
          } catch {
            rawList = [];
          }
        } else if (Array.isArray(req.body.students)) {
          rawList = req.body.students;
        }

        for (const s of rawList) {
          const name = s.name || s.full_name || s.student_name;
          const email = s.email || s.mail || s.mail_id || s.email_id;
          const student_id_number = s.student_id_number || s.student_id || s.id;

          if (name && email && String(email).includes('@')) {
            parsedRows.push({
              name: String(name).trim(),
              email: String(email).trim().toLowerCase(),
              student_id_number: student_id_number ? String(student_id_number).trim() : undefined,
            });
          }
        }
      }

      if (parsedRows.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid student records found in file. Please ensure columns include "Name" and "Email" / "Mail ID".',
        });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const defaultPasswordHash = await bcrypt.hash('StudentPassword123!', salt);

      let createdAccountsCount = 0;
      let newlyEnrolledCount = 0;
      let alreadyEnrolledCount = 0;
      const processedStudents: any[] = [];

      for (let i = 0; i < parsedRows.length; i++) {
        const item = parsedRows[i];
        let studentUserId: number;
        let isNewAccount = false;

        // Check if student exists in userbase (a student can be in multiple courses)
        const existingUser = await db.query(
          `SELECT id, full_name, email, student_id_number FROM users WHERE email = $1`,
          [item.email]
        );

        if (existingUser.rowCount > 0) {
          studentUserId = existingUser.rows[0].id;
        } else {
          // Provision new student account
          const studentIdNum = item.student_id_number || `STU-2026-${(100 + i + (Date.now() % 800)).toString().padStart(3, '0')}`;
          const insertUserRes = await db.query(
            `INSERT INTO users (email, password_hash, full_name, role, department, student_id_number, is_active)
             VALUES ($1, $2, $3, 'student', $4, $5, 1)
             RETURNING id`,
            [item.email, defaultPasswordHash, item.name, course.department || 'Computer Science', studentIdNum]
          );
          studentUserId = insertUserRes.rows[0].id;
          createdAccountsCount++;
          isNewAccount = true;
        }

        // Check if already enrolled in THIS course
        const checkEnroll = await db.query(
          `SELECT id FROM course_enrollments WHERE course_id = $1 AND student_id = $2`,
          [course.id, studentUserId]
        );

        if (checkEnroll.rowCount === 0) {
          const enrollSql = isPg
            ? `INSERT INTO course_enrollments (course_id, student_id) VALUES ($1, $2) ON CONFLICT (course_id, student_id) DO NOTHING`
            : `INSERT OR IGNORE INTO course_enrollments (course_id, student_id) VALUES ($1, $2)`;
          await db.query(enrollSql, [course.id, studentUserId]);
          newlyEnrolledCount++;
        } else {
          alreadyEnrolledCount++;
        }

        processedStudents.push({
          name: item.name,
          email: item.email,
          student_id: studentUserId,
          is_new_user: isNewAccount,
        });
      }

      await logger.info(
        `Faculty ${user.email} imported ${parsedRows.length} students into course ${course.course_code} (${createdAccountsCount} new user accounts created, ${newlyEnrolledCount} newly enrolled)`
      );

      res.status(200).json({
        success: true,
        message: `Successfully imported ${parsedRows.length} students into ${course.course_code}: ${course.course_name}!`,
        course_code: course.course_code,
        total_processed: parsedRows.length,
        new_accounts_created: createdAccountsCount,
        newly_enrolled: newlyEnrolledCount,
        already_enrolled: alreadyEnrolledCount,
        students: processedStudents,
      });
    } catch (err) {
      next(err);
    }
  }
}
