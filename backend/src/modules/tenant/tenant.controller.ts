import { Response } from 'express';
import { Tenant } from './tenant.model';
import { User } from '../employee/employee.model';
import { Subscription } from '../subscription/subscription.model';
import { AuthRequest } from '../../middleware/auth';
import { paginate, generateAgentKey } from '../../utils/helpers';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { sendEmail } from '../../services/email.service';
import { employeeInviteTemplate } from '../../services/emailTemplates';
import { config } from '../../config';

export const createTenant = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { companyName, companyEmail, adminName, phone, plan, status, address, latitude, longitude } = req.body;

  const existing = await Tenant.findOne({ email: companyEmail });
  if (existing) throw new ApiError(409, 'A company with this email already exists.');

  const tenant = await Tenant.create({
    name: companyName,
    email: companyEmail,
    phone,
    plan: plan || 'free',
    status: status || 'trial',
    address: {
      street: address?.street || '',
      city: address?.city || '',
      state: address?.state || '',
      country: address?.country || 'India',
      zipCode: address?.zipCode || '',
      formatted: address?.formatted || '',
    },
    location: { type: 'Point', coordinates: [longitude || 0, latitude || 0] },
    settings: {
      officeLocations: [
        {
          name: `${companyName} HQ`,
          latitude: latitude || 0,
          longitude: longitude || 0,
          radiusMeters: 150,
        },
      ],
    },
  });

  const tempPassword = generateAgentKey().slice(0, 10);
  const admin = await User.create({
    name: adminName,
    email: companyEmail,
    password: tempPassword,
    role: 'company_admin',
    tenantId: tenant._id,
    phone,
    agentKey: generateAgentKey(),
  });

  sendEmail({
    to: admin.email,
    subject: 'Your EMS company account is ready',
    html: employeeInviteTemplate(admin.name, tempPassword, `${config.frontendUrl}/login`),
  }).catch((err) => logger.error('Failed to send welcome email:', err));

  res.status(201).json(new ApiResponse(201, 'Company created.', { tenant, admin: { id: admin._id, email: admin.email } }));
});

export const listTenants = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = 1, limit = 20, status, search } = req.query;
  const { skip, limit: lim } = paginate(Number(page), Number(limit));

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [tenants, total] = await Promise.all([
    Tenant.find(filter).skip(skip).limit(lim).sort({ createdAt: -1 }),
    Tenant.countDocuments(filter),
  ]);

  const tenantIds = tenants.map((t) => t._id);
  const counts = await User.aggregate([
    { $match: { tenantId: { $in: tenantIds } } },
    { $group: { _id: '$tenantId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  const tenantsWithCounts = tenants.map((t) => ({
    ...t.toObject(),
    employeeCount: countMap.get(String(t._id)) || 0,
  }));

  res.json(
    new ApiResponse(200, 'Tenants fetched.', {
      tenants: tenantsWithCounts,
      pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
    })
  );
});

export const getTenant = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenant = await Tenant.findById(id);
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found.');
  }

  const [employeeCount, subscription] = await Promise.all([
    User.countDocuments({ tenantId: id }),
    Subscription.findOne({ tenantId: id }),
  ]);

  res.json(new ApiResponse(200, 'Tenant fetched.', { ...tenant.toObject(), employeeCount, subscription }));
});

export const updateTenant = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const allowedUpdates = ['name', 'status', 'plan', 'phone', 'domain'];
  const updates: Record<string, unknown> = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const tenant = await Tenant.findByIdAndUpdate(id, updates, { new: true });
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found.');
  }

  res.json(new ApiResponse(200, 'Tenant updated.', tenant));
});

export const deleteTenant = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tenant = await Tenant.findByIdAndUpdate(id, { status: 'suspended' }, { new: true });
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found.');
  }

  await User.updateMany({ tenantId: id }, { status: 'suspended' });
  res.json(new ApiResponse(200, 'Tenant suspended.'));
});
