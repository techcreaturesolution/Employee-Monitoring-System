import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { Department } from './department.model';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';

export const listDepartments = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  const departments = await Department.find({ tenantId })
    .populate('managerId', 'name email')
    .sort({ name: 1 })
    .lean();

  res.json(new ApiResponse(200, 'Departments retrieved.', departments));
});

export const createDepartment = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  const { name, managerId, description } = req.body;

  const existing = await Department.findOne({ tenantId, name });
  if (existing) {
    throw new ApiError(409, 'Department with this name already exists.');
  }

  const department = await Department.create({
    name,
    tenantId,
    managerId: managerId || undefined,
    description: description || '',
  });

  res.status(201).json(new ApiResponse(201, 'Department created successfully.', department));
});

export const updateDepartment = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;
  const { name, managerId, description } = req.body;

  if (name) {
    const existing = await Department.findOne({ tenantId, name, _id: { $ne: id } });
    if (existing) {
      throw new ApiError(409, 'Another department with this name already exists.');
    }
  }

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (managerId !== undefined) updates.managerId = managerId || null;
  if (description !== undefined) updates.description = description;

  const department = await Department.findOneAndUpdate(
    { _id: id, tenantId },
    updates,
    { new: true }
  );

  if (!department) {
    throw new ApiError(404, 'Department not found.');
  }

  res.json(new ApiResponse(200, 'Department updated successfully.', department));
});

export const deleteDepartment = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenantId = req.user?.tenantId;

  const department = await Department.findOneAndDelete({ _id: id, tenantId });
  if (!department) {
    throw new ApiError(404, 'Department not found.');
  }

  res.json(new ApiResponse(200, 'Department deleted successfully.'));
});
