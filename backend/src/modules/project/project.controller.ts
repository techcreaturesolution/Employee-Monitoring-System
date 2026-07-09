import { Response } from 'express';
import { Project } from './project.model';
import { AuthRequest } from '../../middleware/auth';
import { paginate } from '../../utils/helpers';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { resolveTenantScope } from '../../utils/resolveTenantScope';

export const listProjects = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = resolveTenantScope(req);
  const { page = 1, limit = 20, status } = req.query as any;
  const { skip, limit: lim } = paginate(Number(page), Number(limit));

  const filter: Record<string, unknown> = { tenantId };
  if (status) filter.status = status;

  if (req.user?.role === 'employee') {
    filter.members = req.user._id;
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate('members', 'name email')
      .populate('createdBy', 'name')
      .skip(skip)
      .limit(lim)
      .sort({ createdAt: -1 })
      .lean(),
    Project.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(200, 'Projects retrieved successfully.', {
      projects,
      pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
    })
  );
});

export const createProject = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = resolveTenantScope(req);
  const { name, description, members } = req.body;

  const project = await Project.create({
    name,
    description: description || '',
    tenantId,
    members: members || [],
    createdBy: req.user?._id,
  });

  res.status(201).json(new ApiResponse(201, 'Project created.', project));
});

export const updateProject = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = resolveTenantScope(req);

  const allowedUpdates = ['name', 'description', 'members', 'status'];
  const updates: Record<string, any> = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  const project = await Project.findOneAndUpdate(
    { _id: id, tenantId },
    updates,
    { new: true }
  );

  if (!project) {
    throw new ApiError(404, 'Project not found.');
  }

  res.json(new ApiResponse(200, 'Project updated.', project));
});

export const getProjectTimeEntries = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = resolveTenantScope(req);

  const project = await Project.findOne({ _id: id, tenantId })
    .populate('timeEntries.userId', 'name email')
    .lean();

  if (!project) {
    throw new ApiError(404, 'Project not found.');
  }

  res.json(new ApiResponse(200, 'Time entries retrieved.', project.timeEntries));
});

export const addTimeEntry = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = resolveTenantScope(req);
  const { date, minutes, description } = req.body;

  const project = await Project.findOne({ _id: id, tenantId });
  if (!project) {
    throw new ApiError(404, 'Project not found.');
  }

  project.timeEntries.push({
    userId: req.user!._id,
    date: date || new Date(),
    minutes: Number(minutes),
    description: description || '',
  });
  project.totalTrackedMinutes += Number(minutes);
  await project.save();

  res.status(201).json(new ApiResponse(201, 'Time entry added.', project));
});
