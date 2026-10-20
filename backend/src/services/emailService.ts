import { getDb } from '../config/db.js';
import { logger } from './loggerService.js';

export interface EmailDispatchRecord {
  recipient_email: string;
  recipient_name: string;
  user_id: number;
  subject: string;
  body_text: string;
  trigger_type: 'assignment_assigned' | 'deadline_24h' | 'marks_released';
  reference_id: number;
}

export class EmailService {
  /**
   * Internal dispatcher: logs email, stores in database audit log, and outputs formatted email
   */
  private static async dispatchEmail(record: EmailDispatchRecord): Promise<void> {
    const db = getDb();

    await db.query(
      `INSERT INTO email_notifications (
        recipient_email, recipient_name, user_id, subject, body_text, trigger_type, reference_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'sent')`,
      [
        record.recipient_email,
        record.recipient_name,
        record.user_id,
        record.subject,
        record.body_text,
        record.trigger_type,
        record.reference_id,
      ]
    );

    console.log('\n============================================================');
    console.log(`📧 [EMAIL TRIGGER: ${record.trigger_type.toUpperCase()}]`);
    console.log(`   To:      ${record.recipient_name} <${record.recipient_email}>`);
    console.log(`   Subject: ${record.subject}`);
    console.log('------------------------------------------------------------');
    console.log(record.body_text.trim());
    console.log('============================================================\n');

    await logger.info(
      `Email trigger [${record.trigger_type}] dispatched to ${record.recipient_email} (${record.subject})`
    );
  }

  /**
   * TRIGGER 1: Assignment Once Assigned
   * Dispatched to all enrolled students when an assignment is published
   */
  static async notifyAssignmentAssigned(assignmentId: number): Promise<number> {
    try {
      const db = getDb();

      // Fetch assignment and course details
      const assignRes = await db.query(
        `SELECT a.*, u.full_name as faculty_name, u.email as faculty_email
         FROM assignments a
         LEFT JOIN users u ON a.faculty_id = u.id
         WHERE a.id = $1`,
        [assignmentId]
      );

      if (assignRes.rowCount === 0) return 0;
      const assignment = assignRes.rows[0];

      // Find enrolled students in this course
      let studentsRes = await db.query(
        `SELECT u.id, u.full_name, u.email
         FROM course_enrollments ce
         JOIN courses c ON ce.course_id = c.id
         JOIN users u ON ce.student_id = u.id
         WHERE c.course_code = $1 AND u.is_active = 1`,
        [assignment.course_code]
      );

      // Fallback: If no explicit course enrollments yet, find active students in the system
      if (studentsRes.rowCount === 0) {
        studentsRes = await db.query(
          `SELECT id, full_name, email FROM users WHERE role = 'student' AND is_active = 1`
        );
      }

      let count = 0;
      for (const student of studentsRes.rows) {
        const body = `Hello ${student.full_name},

A new assignment deliverable has been published for your course:

Course:           ${assignment.course_code} - ${assignment.course_name}
Assignment:       ${assignment.title}
Due Date:         ${new Date(assignment.due_date).toLocaleString()}
Maximum Marks:    ${assignment.max_marks} points
Allowed File(s):  ${assignment.allowed_file_types}
Instructor:       ${assignment.faculty_name}

Description & Guidelines:
${assignment.description}

Please log in to the AWS Student Submission Portal to download reference materials from Amazon S3 and submit your deliverable before the deadline.`;

        await this.dispatchEmail({
          recipient_email: student.email,
          recipient_name: student.full_name,
          user_id: student.id,
          subject: `📘 New Assignment: ${assignment.title} (${assignment.course_code})`,
          body_text: body,
          trigger_type: 'assignment_assigned',
          reference_id: assignment.id,
        });
        count++;
      }

      return count;
    } catch (err) {
      console.error('Error in notifyAssignmentAssigned:', err);
      return 0;
    }
  }

  /**
   * TRIGGER 2: 24 Hours To Go (Deadline Approaching)
   * Dispatched to enrolled students who have NOT yet submitted for assignments due within 24 hours
   */
  static async notify24hDeadlineReminder(assignmentId?: number): Promise<number> {
    try {
      const db = getDb();

      let assignQuery = `
        SELECT a.id, a.title, a.course_code, a.course_name, a.due_date, a.max_marks, u.full_name as faculty_name
        FROM assignments a
        LEFT JOIN users u ON a.faculty_id = u.id
        WHERE a.status = 'published'
      `;
      const params: any[] = [];

      if (assignmentId) {
        assignQuery += ` AND a.id = $1`;
        params.push(assignmentId);
      }

      const assignRes = await db.query(assignQuery, params);
      let totalReminders = 0;

      for (const assignment of assignRes.rows) {
        const dueDate = new Date(assignment.due_date).getTime();
        const now = Date.now();
        const diffHours = (dueDate - now) / (1000 * 60 * 60);

        // If specific assignment requested OR due within next 24-28 hours
        const isEligible = assignmentId ? true : diffHours > 0 && diffHours <= 26;
        if (!isEligible) continue;

        // Find enrolled students who have NOT submitted
        let studentsRes = await db.query(
          `SELECT u.id, u.full_name, u.email
           FROM course_enrollments ce
           JOIN courses c ON ce.course_id = c.id
           JOIN users u ON ce.student_id = u.id
           LEFT JOIN submissions s ON s.assignment_id = $1 AND s.student_id = u.id
           WHERE c.course_code = $2 AND s.id IS NULL AND u.is_active = 1`,
          [assignment.id, assignment.course_code]
        );

        if (studentsRes.rowCount === 0) {
          studentsRes = await db.query(
            `SELECT u.id, u.full_name, u.email
             FROM users u
             LEFT JOIN submissions s ON s.assignment_id = $1 AND s.student_id = u.id
             WHERE u.role = 'student' AND s.id IS NULL AND u.is_active = 1`,
            [assignment.id]
          );
        }

        for (const student of studentsRes.rows) {
          // Check if 24h reminder was already sent today for this assignment
          const alreadySent = await db.query(
            `SELECT id FROM email_notifications 
             WHERE trigger_type = 'deadline_24h' AND reference_id = $1 AND user_id = $2`,
            [assignment.id, student.id]
          );

          if (alreadySent.rowCount > 0 && !assignmentId) {
            continue; // Avoid duplicate automated reminders
          }

          const hoursText = diffHours > 0 ? `${Math.round(diffHours)} hours` : 'less than 24 hours';
          const body = `Hello ${student.full_name},

This is an urgent deadline reminder for your pending deliverable:

Course:           ${assignment.course_code} - ${assignment.course_name}
Assignment:       ${assignment.title}
Deadline:         ${new Date(assignment.due_date).toLocaleString()} (${hoursText} remaining)
Maximum Score:    ${assignment.max_marks} marks

Our records indicate that you have NOT yet submitted this assignment. 

Please log in to the AWS Student Submission Portal as soon as possible to upload your deliverable to secure Amazon S3 storage before the cutoff time to prevent late penalties.`;

          await this.dispatchEmail({
            recipient_email: student.email,
            recipient_name: student.full_name,
            user_id: student.id,
            subject: `⏰ Urgent Reminder: 24 Hours Remaining for ${assignment.title} (${assignment.course_code})`,
            body_text: body,
            trigger_type: 'deadline_24h',
            reference_id: assignment.id,
          });
          totalReminders++;
        }
      }

      return totalReminders;
    } catch (err) {
      console.error('Error in notify24hDeadlineReminder:', err);
      return 0;
    }
  }

  /**
   * TRIGGER 3: Marks Released
   * Dispatched to a student when faculty reveals/publishes their grade and feedback
   */
  static async notifyMarksReleased(submissionId: number): Promise<boolean> {
    try {
      const db = getDb();

      const subRes = await db.query(
        `SELECT 
          s.id, s.marks_awarded, s.faculty_feedback, s.grade_status, s.file_name,
          a.id as assignment_id, a.title as assignment_title, a.course_code, a.course_name, a.max_marks,
          u.id as student_id, u.full_name as student_name, u.email as student_email,
          g.full_name as grader_name
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN users u ON s.student_id = u.id
        LEFT JOIN users g ON s.graded_by = g.id
        WHERE s.id = $1`,
        [submissionId]
      );

      if (subRes.rowCount === 0) return false;
      const sub = subRes.rows[0];

      if (sub.grade_status !== 'published' || sub.marks_awarded === null) {
        return false;
      }

      const maxMarks = sub.max_marks || 100;
      const percentage = ((sub.marks_awarded / maxMarks) * 100).toFixed(1);

      const body = `Hello ${sub.student_name},

Your academic evaluation has officially been completed and marks have been released for:

Course:           ${sub.course_code} - ${sub.course_name}
Assignment:       ${sub.assignment_title}
File Evaluated:   ${sub.file_name}

RESULTS:
Marks Awarded:    ${sub.marks_awarded} / ${maxMarks} (${percentage}%)
Evaluated By:     ${sub.grader_name || 'Course Instructor'}

FACULTY FEEDBACK COMMENTARY:
"${sub.faculty_feedback || 'Well done on completing this deliverable.'}"

You can view your detailed evaluation summary, download your submission file from Amazon S3, and review class performance on the AWS Student Submission Portal.`;

      await this.dispatchEmail({
        recipient_email: sub.student_email,
        recipient_name: sub.student_name,
        user_id: sub.student_id,
        subject: `🎉 Marks Released: ${sub.assignment_title} (${sub.course_code})`,
        body_text: body,
        trigger_type: 'marks_released',
        reference_id: sub.id,
      });

      return true;
    } catch (err) {
      console.error('Error in notifyMarksReleased:', err);
      return false;
    }
  }

  /**
   * Start recurring background timer for checking 24h deadlines (every 15 minutes)
   */
  static initDeadlineCron(intervalMs: number = 15 * 60 * 1000): void {
    console.log('⏰ Initializing automated 24-hour deadline email reminder service...');
    // Initial check after 10 seconds
    setTimeout(() => {
      this.notify24hDeadlineReminder().catch(console.error);
    }, 10000);

    // Periodic check
    setInterval(() => {
      this.notify24hDeadlineReminder().catch(console.error);
    }, intervalMs);
  }
}
