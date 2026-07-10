import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { WFHRequest } from './wfh.model';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { resolveTenantScope } from '../../utils/resolveTenantScope';
import { paginate } from '../../utils/helpers';

export const applyWFH = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = resolveTenantScope(req);
  const userId = req.user!._id;
  const { date, reason } = req.body;

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const existing = await WFHRequest.findOne({ tenantId, userId, date: targetDate });
  if (existing) {
    throw new ApiError(409, 'WFH request already exists for this date.');
  }

  const wfhRequest = await WFHRequest.create({
    tenantId,
    userId,
    date: targetDate,
    reason,
    status: 'pending',
  });

  res.status(201).json(new ApiResponse(201, 'WFH request submitted successfully.', wfhRequest));
});

export const getMyWFH = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = resolveTenantScope(req);
  const userId = req.user!._id;
  const { status, page = 1, limit = 20 } = req.query as any;
  
  const filter: any = { tenantId, userId };
  if (status) filter.status = status;

  const { skip, limit: lim } = paginate(Number(page), Number(limit));

  const [requests, total] = await Promise.all([
    WFHRequest.find(filter).sort({ date: -1 }).skip(skip).limit(lim),
    WFHRequest.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, 'My WFH requests fetched.', {
    requests,
    pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
  }));
});

export const listWFH = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = resolveTenantScope(req);
  const { status, page = 1, limit = 20 } = req.query as any;

  const filter: any = { tenantId };
  if (status) filter.status = status;

  const { skip, limit: lim } = paginate(Number(page), Number(limit));

  const [requests, total] = await Promise.all([
    WFHRequest.find(filter).populate('userId', 'name email employeeId avatar').sort({ date: -1 }).skip(skip).limit(lim),
    WFHRequest.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, 'WFH requests fetched.', {
    requests,
    pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
  }));
});

export const updateWFH = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = resolveTenantScope(req);
  const { id } = req.params;
  const { status } = req.body;

  const request = await WFHRequest.findOneAndUpdate(
    { _id: id, tenantId },
    { status, approvedBy: req.user!._id },
    { new: true }
  );

  if (!request) {
    throw new ApiError(404, 'WFH request not found.');
  }

  res.json(new ApiResponse(200, `WFH request ${status}.`, request));
});
