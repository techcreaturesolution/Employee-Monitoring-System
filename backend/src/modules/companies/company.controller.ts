import { Response, NextFunction } from "express";
import { Tenant } from "./Company.model";
import { User } from "../users/User.model";
import { Subscription } from "../subscriptions/Subscription.model";
import { AuthRequest } from "../../middleware/auth";
import { paginate } from "../../utils/helpers";
import { logger } from "../../utils/logger";

const listTenants = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const { skip, limit: lim } = paginate(Number(page), Number(limit));

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [tenants, total] = await Promise.all([
      Tenant.find(filter).skip(skip).limit(lim).sort({ createdAt: -1 }),
      Tenant.countDocuments(filter),
    ]);

    const tenantIds = tenants.map((t) => t._id);
    const counts = await User.aggregate([
      { $match: { tenantId: { $in: tenantIds } } },
      { $group: { _id: "$tenantId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    const tenantsWithCounts = tenants.map((t) => ({
      ...t.toObject(),
      employeeCount: countMap.get(String(t._id)) || 0,
    }));

    res.json({
      success: true,
      data: {
        tenants: tenantsWithCounts,
        pagination: {
          total,
          page: Number(page),
          limit: lim,
          pages: Math.ceil(total / lim),
        },
      },
    });
  } catch (error) {
    logger.error("listTenants failed:", error);
    next(error);
  }
};

const getTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findById(id);
    if (!tenant) {
      res.status(404).json({ success: false, message: "Tenant not found." });
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
    logger.error("getTenant failed:", error);
    next(error);
  }
};

const updateTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const allowedUpdates = ["name", "status", "plan", "phone", "domain"];
    const updates: Record<string, unknown> = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const tenant = await Tenant.findByIdAndUpdate(id, updates, { new: true });
    if (!tenant) {
      res.status(404).json({ success: false, message: "Tenant not found." });
      return;
    }

    res.json({ success: true, message: "Tenant updated.", data: tenant });
  } catch (error) {
    logger.error("updateTenant failed:", error);
    next(error);
  }
};

const deleteTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findByIdAndUpdate(
      id,
      { status: "suspended" },
      { new: true }
    );
    if (!tenant) {
      res.status(404).json({ success: false, message: "Tenant not found." });
      return;
    }

    await User.updateMany({ tenantId: id }, { status: "suspended" });
    res.json({ success: true, message: "Tenant suspended." });
  } catch (error) {
    logger.error("deleteTenant failed:", error);
    next(error);
  }
};

export { listTenants, getTenant, updateTenant, deleteTenant };
