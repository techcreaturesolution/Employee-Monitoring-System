import { Router } from 'express';
import {
  listManagers,
  getManager,
  createManager,
  updateManager,
  deleteManager,
  assignTeam,
  getManagerTeam,
  getManagerDashboard,
} from '../controllers/managerController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Manager CRUD — company_admin / super_admin only
router.get('/', authorize('company_admin', 'super_admin'), listManagers);
router.post('/', authorize('company_admin', 'super_admin'), createManager);

// Team management
router.post('/assign-team', authorize('company_admin', 'super_admin'), assignTeam);

// Manager-level dashboard (manager can access their own, admin can see any)
router.get('/dashboard', authorize('company_admin', 'super_admin', 'manager'), getManagerDashboard);

// These must come after named routes to avoid ":id" swallowing "dashboard" etc.
router.get('/team/:id', authorize('company_admin', 'super_admin', 'manager'), getManagerTeam);
router.get('/:id', authorize('company_admin', 'super_admin'), getManager);
router.put('/:id', authorize('company_admin', 'super_admin'), updateManager);
router.delete('/:id', authorize('company_admin', 'super_admin'), deleteManager);

export default router;
