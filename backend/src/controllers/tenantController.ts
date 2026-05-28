import { Response } from 'express';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import { AuthRequest } from '../middleware/auth';
import { paginate } from '../utils/helpers';

export const listTenants = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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

    const tenantsWithCounts = await Promise.all(
      tenants.map(async (tenant) => {
        const employeeCount = await User.countDocuments({ tenantId: tenant._id });
        return { ...tenant.toObject(), employeeCount };
      })
    );

    res.json({
      success: true,
      data: {
        tenants: tenantsWithCounts,
        pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed.', error: (error as Error).message });
  }
};

export const getTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findById(id);
    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant not found.' });
      return;
    }

    const [employeeCount, subscription] = await Promise.all([
      User.countDocuments({ tenantId: id }),
      Subscription.findOne({ tenantId: id }),
    ]);

    res.json({
      success: true,
      data: { ...tenant.toObject(), employeeCount, subscription },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed.', error: (error as Error).message });
  }
};

export const updateTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const allowedUpdates = ['name', 'status', 'plan', 'phone', 'domain'];
    const updates: Record<string, unknown> = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const tenant = await Tenant.findByIdAndUpdate(id, updates, { new: true });
    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant not found.' });
      return;
    }

    res.json({ success: true, message: 'Tenant updated.', data: tenant });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed.', error: (error as Error).message });
  }
};

export const deleteTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findByIdAndUpdate(id, { status: 'suspended' }, { new: true });
    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant not found.' });
      return;
    }

    await User.updateMany({ tenantId: id }, { status: 'suspended' });
    res.json({ success: true, message: 'Tenant suspended.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed.', error: (error as Error).message });
  }
};
