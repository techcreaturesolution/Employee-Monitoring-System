import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Tenant } from '../models/Tenant';
import { generateTokens, generateAgentKey } from '../utils/helpers';
import { AuthRequest } from '../middleware/auth';
import { registerSchema, loginSchema } from '../validators/authValidator';
import { z } from 'zod';
import { config } from '../config';
import { logger } from '../utils/logger';
import { uploadToCloudinary } from '../utils/cloudinary';

const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let validated;
    try {
      validated = registerSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      throw error;
    }

    const existingTenant = await Tenant.findOne({ email: validated.email });
    if (existingTenant) {
      res.status(409).json({ success: false, message: 'Company with this email already exists.' });
      return;
    }

    const tenant = await Tenant.create({
      name: validated.companyName,
      email: validated.email,
      phone: validated.phone || '',
    });

    const user = await User.create({
      name: validated.name,
      email: validated.email,
      password: validated.password,
      role: 'company_admin',
      tenantId: tenant._id,
      phone: validated.phone || '',
      agentKey: generateAgentKey(),
    });

    const { accessToken, refreshToken } = generateTokens(user);

    res.cookie('ems_token', accessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    res.cookie('ems_refresh_token', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

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
    logger.error('Registration failed:', error);
    next(error);
  }
};

const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let validated;
    try {
      validated = loginSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      throw error;
    }

    const { email, password, deviceId } = validated;

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
    
    let tenant = null;
    if (user.tenantId) {
      tenant = await Tenant.findById(user.tenantId);
      if (tenant && tenant.status === 'suspended') {
        res.status(403).json({ success: false, message: 'Company account is suspended. Contact support.' });
        return;
      }
    }

    user.lastActive = new Date();
    user.isOnline = true;
    
    if (!user.agentKey) {
      user.agentKey = generateAgentKey();
      logger.info(`Generated new agentKey for user: ${user.email}`);
    }

    if (deviceId) {
      user.deviceFingerprints = user.deviceFingerprints || [];
      if (!user.deviceFingerprints.includes(deviceId)) {
        user.deviceFingerprints.push(deviceId);
      }
    }
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user);

    res.cookie('ems_token', accessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    res.cookie('ems_refresh_token', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

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
          agentKey: user.agentKey,
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
    logger.error('Login failed:', error);
    next(error);
  }
};

const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
          workMode: user.workMode,
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
    logger.error('Failed to get profile:', error);
    next(error);
  }
};

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  phone: z.string().max(20).trim().optional(),
  avatar: z.string().url().max(500).optional(),
  department: z.string().max(100).trim().optional(),
  designation: z.string().max(100).trim().optional(),
});

const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    let validated;
    try {
      validated = updateProfileSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      throw error;
    }

    const updated = await User.findByIdAndUpdate(user._id, validated, { new: true });
    res.json({ success: true, message: 'Profile updated.', data: updated });
  } catch (error) {
    logger.error('Update failed:', error);
    next(error);
  }
};

const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.clearCookie('ems_token', { path: '/', httpOnly: true, secure: config.nodeEnv === 'production', sameSite: config.nodeEnv === 'production' ? 'none' : 'lax' });
    res.clearCookie('ems_refresh_token', { path: '/', httpOnly: true, secure: config.nodeEnv === 'production', sameSite: config.nodeEnv === 'production' ? 'none' : 'lax' });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    logger.error('Logout failed:', error);
    next(error);
  }
};

const uploadAvatarController = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: 'No file provided.' });
      return;
    }

    let avatarUrl = `/uploads/avatars/${file.filename}`;

    try {
      const cloudinaryResult = await uploadToCloudinary(file.path, 'avatars');
      if (cloudinaryResult) {
        avatarUrl = cloudinaryResult.secureUrl;
      }
    } catch (uploadError) {
      logger.error('Failed to upload avatar to Cloudinary, using local fallback:', uploadError);
    }

    const updatedUser = await User.findByIdAndUpdate(user._id, { avatar: avatarUrl }, { new: true });

    res.json({
      success: true,
      message: 'Avatar uploaded successfully.',
      data: {
        avatar: updatedUser?.avatar,
      },
    });
  } catch (error) {
    logger.error('Avatar upload failed:', error);
    next(error);
  }
};

interface JwtPayload {
  userId: string;
  role: string;
  tenantId: string;
}

const refreshToken = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.ems_refresh_token;

    if (!token) {
      res.status(401).json({ success: false, message: 'Refresh token not found.' });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
    
    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      res.status(401).json({ success: false, message: 'Invalid token or user inactive.' });
      return;
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    res.cookie('ems_token', accessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    res.cookie('ems_refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    logger.error('Token refresh failed:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }
};

export { register, login, getMe, updateProfile, logout, uploadAvatarController, refreshToken };
