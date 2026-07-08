import { Router } from 'express';
import { listTasks, createTask, updateTask } from './task.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
} from './task.validation';

const router = Router();

router.use(authenticate);

router.get('/', validate(taskQuerySchema, 'query'), listTasks);
router.post('/', validate(createTaskSchema), createTask);
router.put('/:id', validate(updateTaskSchema), updateTask);

export default router;
