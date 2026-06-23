import { Response } from 'express';
import { Project } from '../models/Project';
import { AuthRequest } from '../middleware/auth';
import { paginate } from '../utils/helpers';

export const listProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { page = 1, limit = 20, status } = req.query;
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
        .sort({ createdAt: -1 }),
      Project.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        projects,
        pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list projects.', error: (error as Error).message });
  }
};

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { name, description, members } = req.body;

    const project = await Project.create({
      name,
      description: description || '',
      tenantId,
      members: members || [],
      createdBy: req.user?._id,
    });

    res.status(201).json({ success: true, message: 'Project created.', data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create project.', error: (error as Error).message });
  }
};

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const project = await Project.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    res.json({ success: true, message: 'Project updated.', data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update project.', error: (error as Error).message });
  }
};

export const getProjectTimeEntries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const project = await Project.findOne({ _id: id, tenantId })
      .populate('timeEntries.userId', 'name email');

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    res.json({ success: true, data: project.timeEntries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get entries.', error: (error as Error).message });
  }
};

export const addTimeEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const { date, minutes, description } = req.body;

    const project = await Project.findOne({ _id: id, tenantId });
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    project.timeEntries.push({
      userId: req.user!._id,
      date,
      minutes: Number(minutes),
      description: description || '',
    });
    project.totalTrackedMinutes += Number(minutes);
    await project.save();

    res.status(201).json({ success: true, message: 'Time entry added.', data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add entry.', error: (error as Error).message });
  }
};
