import { Router } from 'express';
import { AssignmentController } from '../controllers/assignmentController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleAuth.js';
import { uploadMiddleware } from '../middleware/upload.js';

const router = Router();

// All assignment routes require valid JWT
router.use(authenticateToken);

// List assignments (Students see published/closed; Faculty see their own; Admin sees all)
router.get('/', AssignmentController.listAssignments);

// Get specific assignment
router.get('/:id', AssignmentController.getAssignmentById);

// Faculty & Admin: Create assignment with optional reference file
router.post(
  '/',
  requireRole('faculty', 'admin'),
  uploadMiddleware.single('reference_file'),
  AssignmentController.createAssignment
);

// Faculty & Admin: Edit assignment
router.put(
  '/:id',
  requireRole('faculty', 'admin'),
  uploadMiddleware.single('reference_file'),
  AssignmentController.updateAssignment
);

// Faculty & Admin: Delete assignment
router.delete(
  '/:id',
  requireRole('faculty', 'admin'),
  AssignmentController.deleteAssignment
);

// Faculty & Admin: Send 24-hour deadline reminder emails
router.post(
  '/:id/send-reminder',
  requireRole('faculty', 'admin'),
  AssignmentController.send24hReminders
);

export default router;
