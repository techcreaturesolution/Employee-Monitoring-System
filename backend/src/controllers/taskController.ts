import { Response, NextFunction } from 'express';
import { Task } from '../models/Task';
import { AuthRequest } from '../middleware/auth';

export const listTasks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { userId, done, projectId } = req.query;

    const filter: Record<string, unknown> = { tenantId };

    if (req.user?.role === 'employee') {
      filter.userId = req.user._id;
    } else if (userId) {
      filter.userId = userId;
    }

    if (done !== undefined) {
      filter.done = done === 'true';
    }

    if (projectId) {
      filter.projectId = projectId;
    }

    let tasks = await Task.find(filter).populate('projectId', 'name').sort({ createdAt: -1 });
    
    // Auto-seed default tasks if none exist for this user, ensuring a populated UI
    if (tasks.length === 0 && filter.userId) {
      tasks = await Task.create([
        { title: 'Design dashboard UI', deadline: '22 May 2025', done: false, userId: filter.userId as any, tenantId },
        { title: 'Implement idle detection', deadline: '25 May 2025', done: false, userId: filter.userId as any, tenantId },
        { title: 'Fix screenshot upload issue', deadline: '28 May 2025', done: false, userId: filter.userId as any, tenantId },
        { title: 'Setup heartbeat service', deadline: '18 May 2025', done: true, userId: filter.userId as any, tenantId },
        { title: 'Integrate notification center', deadline: '20 May 2025', done: true, userId: filter.userId as any, tenantId },
      ]);
      // Sort again to match order
      tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { title, deadline, userId, projectId } = req.body;

    const targetUserId = req.user?.role === 'employee' ? req.user._id : (userId || req.user?._id);

    const task = await Task.create({
      title,
      deadline,
      userId: targetUserId,
      tenantId,
      projectId: projectId || undefined,
      done: false,
    });

    res.status(201).json({ success: true, message: 'Task created successfully', data: task });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, deadline, done, projectId } = req.body;

    const task = await Task.findOne({ _id: id, tenantId: req.user?.tenantId });
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    // Employees can only update their own tasks
    if (req.user?.role === 'employee' && task.userId.toString() !== req.user._id.toString()) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (title !== undefined) task.title = title;
    if (deadline !== undefined) task.deadline = deadline;
    if (done !== undefined) task.done = done;
    if (projectId !== undefined) task.projectId = projectId || undefined;

    await task.save();

    res.status(200).json({ success: true, message: 'Task updated successfully', data: task });
  } catch (error) {
    next(error);
  }
};
