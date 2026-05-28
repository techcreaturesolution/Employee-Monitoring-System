import { Request, Response } from 'express';
import { User } from '../models/User';
import { Tenant } from '../models/Tenant';
import { generateTokens, generateAgentKey } from '../utils/helpers';
import { AuthRequest } from '../middleware/auth';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyName, name, email, password, phone } = req.body;

    const existingTenant = await Tenant.findOne({ email });
    if (existingTenant) {
      res.status(409).json({ success: false, message: 'Company with this email already exists.' });
      return;
    }

    const tenant = await Tenant.create({
      name: companyName,
      email,
      phone: phone || '',
    });

    const user = await User.create({
      name,
      email,
      password,
      role: 'company_admin',
      tenantId: tenant._id,
      phone: phone || '',
      agentKey: generateAgentKey(),
    });

    const { accessToken, refreshToken } = generateTokens(user);

    res.status(201).json({
      success: true,
      message: 'Company registered successfully.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: tenant._id,
        },
        tenant: {
          id: tenant._id,
          name: tenant.name,
          plan: tenant.plan,
          status: tenant.status,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed.', error: (error as Error).message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ success: false, message: 'Your account has been deactivated.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    user.lastActive = new Date();
    user.isOnline = true;
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user);

    let tenant = null;
    if (user.tenantId) {
      tenant = await Tenant.findById(user.tenantId);
    }

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          department: user.department,
          designation: user.designation,
          avatar: user.avatar,
        },
        tenant: tenant
          ? {
              id: tenant._id,
              name: tenant.name,
              plan: tenant.plan,
              status: tenant.status,
            }
          : null,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed.', error: (error as Error).message });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    let tenant = null;
    if (user.tenantId) {
      tenant = await Tenant.findById(user.tenantId);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          department: user.department,
          designation: user.designation,
          avatar: user.avatar,
          phone: user.phone,
          employeeId: user.employeeId,
          agentKey: user.agentKey,
          lastActive: user.lastActive,
          isOnline: user.isOnline,
        },
        tenant: tenant
          ? {
              id: tenant._id,
              name: tenant.name,
              plan: tenant.plan,
              status: tenant.status,
              settings: tenant.settings,
            }
          : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get profile.', error: (error as Error).message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const allowedUpdates = ['name', 'phone', 'avatar', 'department', 'designation'];
    const updates: Record<string, unknown> = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const updated = await User.findByIdAndUpdate(user._id, updates, { new: true });
    res.json({ success: true, message: 'Profile updated.', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed.', error: (error as Error).message });
  }
};
