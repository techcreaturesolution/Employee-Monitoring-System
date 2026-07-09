import { Response } from 'express';
import { Task } from './task.model';
import { AuthRequest } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { resolveTenantScope } from '../../utils/resolveTenantScope';

export const listTasks = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = resolveTenantScope(req);
  const { userId, done, projectId } = req.query as any;

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

  res.json(new ApiResponse(200, 'Tasks retrieved successfully.', tasks));
});

export const createTask = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = resolveTenantScope(req);
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

  res.status(201).json(new ApiResponse(201, 'Task created successfully', task));
});

export const updateTask = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { title, deadline, done, projectId } = req.body;

  const task = await Task.findOne({ _id: id, tenantId: resolveTenantScope(req) });
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  // Employees can only update their own tasks
  if (req.user?.role === 'employee' && task.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Unauthorized');
  }

  if (title !== undefined) task.title = title;
  if (deadline !== undefined) task.deadline = deadline;
  if (done !== undefined) task.done = done;
  if (projectId !== undefined) task.projectId = projectId || undefined;

  await task.save();

  res.json(new ApiResponse(200, 'Task updated successfully', task));
});
