import { Request, Response, NextFunction } from 'express';
import { getDb } from '../config/db.js';
import { EmailService } from '../services/emailService.js';

export class NotificationController {
  /**
   * Get email notifications for current logged-in user
   */
  static async getMyNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const db = getDb();

      const query = `
        SELECT id, recipient_email, recipient_name, subject, body_text, trigger_type, reference_id, status, sent_at
        FROM email_notifications
        WHERE recipient_email = $1 OR user_id = $2
        ORDER BY sent_at DESC
        LIMIT 50
      `;

      const result = await db.query(query, [user.email, user.id]);
      res.json({ success: true, count: result.rows.length, notifications: result.rows });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin & Faculty: View all email notifications dispatched by portal
   */
  static async getAllNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const query = `
        SELECT id, recipient_email, recipient_name, subject, body_text, trigger_type, reference_id, status, sent_at
        FROM email_notifications
        ORDER BY sent_at DESC
        LIMIT 100
      `;

      const result = await db.query(query);
      res.json({ success: true, count: result.rows.length, notifications: result.rows });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Run 24h deadline reminder check on-demand
   */
  static async triggerDeadlineCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await EmailService.notify24hDeadlineReminder();
      res.json({
        success: true,
        message: `24-hour deadline scan completed. Dispatched ${count} reminder emails.`,
        sent_count: count,
      });
    } catch (err) {
      next(err);
    }
  }
}
