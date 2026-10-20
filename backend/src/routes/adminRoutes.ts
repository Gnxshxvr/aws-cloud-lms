import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleAuth.js';

const router = Router();

// Strict server-side role check: only administrator can access any admin endpoint
router.use(authenticateToken);
router.use(requireRole('admin'));

router.get('/stats', AdminController.getStats);
router.get('/users', AdminController.listUsers);
router.post('/users', AdminController.createUser);
router.put('/users/:id/status', AdminController.toggleUserStatus);
router.get('/submissions', AdminController.listAllSubmissions);

export default router;
