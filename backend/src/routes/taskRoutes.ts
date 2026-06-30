import { Router } from 'express';
import { listTasks, createTask, updateTask } from '../controllers/taskController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listTasks);
router.post('/', createTask);
router.put('/:id', updateTask);

export default router;
