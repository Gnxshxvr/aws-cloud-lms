import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getDb } from '../config/db.js';
import { config } from '../config/env.js';
import { logger } from '../services/loggerService.js';

const registerSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  full_name: z.string().min(2, 'Full name is required'),
  department: z.string().optional(),
  student_id_number: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = registerSchema.parse(req.body);
      const db = getDb();

      // Check if user already exists
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [data.email.toLowerCase().trim()]);
      if (existing.rowCount > 0) {
        res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        return;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(data.password, salt);

      // Student registration is public; role is always strictly student
      await db.query(
        `INSERT INTO users (email, password_hash, full_name, role, department, student_id_number, is_active)
         VALUES ($1, $2, $3, 'student', $4, $5, 1)`,
        [data.email.toLowerCase().trim(), passwordHash, data.full_name.trim(), data.department || null, data.student_id_number || null]
      );

      // Fetch created user
      const userRes = await db.query(
        'SELECT id, email, role, full_name, department, student_id_number, created_at FROM users WHERE email = $1',
        [data.email.toLowerCase().trim()]
      );
      const newUser = userRes.rows[0];

      // Sign JWT
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn as any }
      );

      await logger.info(`New student registered: ${newUser.email} (ID: ${newUser.id})`);

      res.status(201).json({
        success: true,
        message: 'Registration successful! Welcome to the student portal.',
        token,
        user: newUser,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const db = getDb();

      const result = await db.query(
        'SELECT id, email, password_hash, role, full_name, department, student_id_number, is_active FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      );

      if (result.rowCount === 0) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      const user = result.rows[0];

      if (!user.is_active) {
        res.status(403).json({
          success: false,
          message: 'This account has been deactivated. Please contact the administrator.',
        });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      // Record audit log
      await db.query(
        'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
        [user.id, 'USER_LOGIN', `User ${user.email} signed in with role ${user.role}`, req.ip || '127.0.0.1']
      );

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn as any }
      );

      const userSafe = {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        department: user.department,
        student_id_number: user.student_id_number,
      };

      await logger.info(`Successful login: ${user.email} (${user.role})`);

      res.json({
        success: true,
        message: 'Login successful.',
        token,
        user: userSafe,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated.' });
        return;
      }
      res.json({ success: true, user: req.user });
    } catch (err) {
      next(err);
    }
  }
}
