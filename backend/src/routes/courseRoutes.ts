import { Router } from 'express';
import { CourseController } from '../controllers/courseController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleAuth.js';

import { uploadMiddleware } from '../middleware/upload.js';

const router = Router();

// All course routes require authentication
router.use(authenticateToken);

// List courses (Faculty gets own; Student/Admin gets all)
router.get('/', CourseController.listCourses);

// Get single course details with roster & assignments
router.get('/:id', CourseController.getCourseById);

// Create new course (Faculty & Admin)
router.post(
  '/',
  requireRole('faculty', 'admin'),
  CourseController.createCourse
);

// Faculty: Generate 30 random students for a course
router.post(
  '/:id/generate-students',
  requireRole('faculty', 'admin'),
  CourseController.generate30Students
);

// Faculty: Import students from Excel / CSV spreadsheet into course
router.post(
  '/:id/import-roster',
  requireRole('faculty', 'admin'),
  uploadMiddleware.single('file'),
  CourseController.importRoster
);

export default router;
