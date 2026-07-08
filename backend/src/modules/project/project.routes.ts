import { Router } from 'express';
import {
  listProjects,
  createProject,
  updateProject,
  getProjectTimeEntries,
  addTimeEntry,
} from './project.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createProjectSchema,
  updateProjectSchema,
  addTimeEntrySchema,
  projectQuerySchema,
} from './project.validation';

const router = Router();

router.use(authenticate);

router.get('/', validate(projectQuerySchema, 'query'), listProjects);
router.post('/', authorize('company_admin', 'manager', 'super_admin'), validate(createProjectSchema), createProject);
router.put('/:id', authorize('company_admin', 'manager', 'super_admin'), validate(updateProjectSchema), updateProject);
router.get('/:id/time-entries', getProjectTimeEntries);
router.post('/:id/time-entries', validate(addTimeEntrySchema), addTimeEntry);

export default router;
