import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { getDb } from '../config/db.js';

export interface AuthUser {
  id: number;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  full_name: string;
  department?: string;
  student_id_number?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { id: number; email: string; role: string };
    const db = getDb();
    const result = await db.query(
      'SELECT id, email, role, full_name, department, student_id_number, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rowCount === 0) {
      res.status(401).json({ success: false, message: 'Invalid session. User no longer exists.' });
      return;
    }

    const user = result.rows[0];
    if (!user.is_active) {
      res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact an administrator.' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      department: user.department,
      student_id_number: user.student_id_number,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
      return;
    }
    res.status(401).json({ success: false, message: 'Invalid authentication token.' });
  }
}
