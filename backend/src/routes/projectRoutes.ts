import { Router } from 'express';
import {
  listProjects,
  createProject,
  updateProject,
  getProjectTimeEntries,
  addTimeEntry,
} from '../controllers/projectController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listProjects);
router.post('/', authorize('company_admin', 'manager', 'super_admin'), createProject);
router.put('/:id', authorize('company_admin', 'manager', 'super_admin'), updateProject);
router.get('/:id/time-entries', getProjectTimeEntries);
router.post('/:id/time-entries', addTimeEntry);

export default router;
