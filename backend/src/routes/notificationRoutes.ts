import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleAuth.js';

const router = Router();

// All notification routes require authentication
router.use(authenticateToken);

// Current user's email notifications
router.get('/my', NotificationController.getMyNotifications);

// Faculty & Admin: All system email dispatches
router.get('/all', requireRole('faculty', 'admin'), NotificationController.getAllNotifications);

// Faculty & Admin: Trigger 24h deadline scan
router.post('/trigger-24h', requireRole('faculty', 'admin'), NotificationController.triggerDeadlineCheck);

export default router;
