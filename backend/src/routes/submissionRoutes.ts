import { Router } from 'express';
import { SubmissionController } from '../controllers/submissionController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleAuth.js';
import { uploadMiddleware } from '../middleware/upload.js';

const router = Router();

// All submission routes require valid JWT
router.use(authenticateToken);

// Student: Submit assignment file (uploaded to S3)
router.post(
  '/:assignmentId',
  requireRole('student'),
  uploadMiddleware.single('file'),
  SubmissionController.submitAssignment
);

// Student: List my submissions with status, grades, and feedback
router.get(
  '/my',
  requireRole('student'),
  SubmissionController.getStudentSubmissions
);

// Faculty & Admin: View submissions for an assignment
router.get(
  '/assignment/:assignmentId',
  requireRole('faculty', 'admin'),
  SubmissionController.getAssignmentSubmissions
);

// Faculty & Admin: Grade and provide feedback on a submission
router.post(
  '/:submissionId/grade',
  requireRole('faculty', 'admin'),
  SubmissionController.gradeSubmission
);

// Faculty & Admin: Reveal or hide marks for an individual student submission
router.patch(
  '/:submissionId/reveal',
  requireRole('faculty', 'admin'),
  SubmissionController.revealSubmissionMark
);

// Faculty & Admin: Reveal all marks for an assignment in bulk
router.post(
  '/assignment/:assignmentId/reveal-all',
  requireRole('faculty', 'admin'),
  SubmissionController.revealAllAssignmentMarks
);

// Faculty & Admin: Hide all marks for an assignment in bulk
router.post(
  '/assignment/:assignmentId/hide-all',
  requireRole('faculty', 'admin'),
  SubmissionController.hideAllAssignmentMarks
);

// Secure time-limited S3 presigned download URL
router.get(
  '/:submissionId/download',
  SubmissionController.getDownloadUrl
);

export default router;
