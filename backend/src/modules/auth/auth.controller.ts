import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../employee/employee.model';
import { Tenant } from '../tenant/tenant.model';
import { Attendance } from '../attendance/attendance.model';
import { Department } from '../department/department.model';
import { generateTokens, generateAgentKey, formatDate, calculateWorkMinutes } from '../../utils/helpers';
import { AuthRequest } from '../../middleware/auth';
import { config } from '../../config';
import { cache } from '../../services/cache';
import { logger } from '../../utils/logger';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { checkPasswordStrength } from '../../utils/passwordStrength';
import { sendEmail } from '../../services/email.service';
import { welcomeEmailTemplate, passwordResetTemplate, passwordChangedTemplate, verificationEmailTemplate } from '../../services/emailTemplates';

interface JwtPayload {
  userId: string;
  role: string;
  tenantId: string;
}

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const validated = req.body;

  // Password strength check
  const strength = checkPasswordStrength(validated.password, [
    validated.name,
    validated.email,
    validated.companyName,
  ]);
  if (!strength.isStrong) {
    throw new ApiError(400, strength.feedback || 'Password is too weak. Add more length or variety.');
  }

  const existingTenant = await Tenant.findOne({ email: validated.email });
  if (existingTenant) {
    throw new ApiError(409, 'Company with this email already exists.');
  }

  const tenant = await Tenant.create({
    name: validated.companyName,
    email: validated.email,
    phone: validated.phone || '',
  });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const user = await User.create({
    name: validated.name,
    email: validated.email,
    password: validated.password,
    role: 'company_admin',
    tenantId: tenant._id,
    phone: validated.phone || '',
    agentKey: generateAgentKey(),
    emailVerificationTokenHash: hashedToken,
    emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

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

  await cache.set(`email_verify:${hashedToken}`, String(user._id), 24 * 60 * 60); // 24 hours

  const verifyLink = `${config.frontendUrl}/verify-email?token=${rawToken}`;
  
  sendEmail({
    to: user.email,
    subject: 'Welcome to EMS - Verify Your Email',
    html: verificationEmailTemplate(user.name, verifyLink),
  }).catch((err: any) => logger.error('Failed to send verification email:', err));

  res.status(201).json(
    new ApiResponse(201, 'Company registered successfully.', {
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
      refreshToken: newRefreshToken,
    })
  );
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, deviceId } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (user.status !== 'active') {
    throw new ApiError(403, 'Your account has been deactivated.');
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, 'Please verify your email before logging in.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  let tenant = null;
  if (user.tenantId) {
    const tenantCacheKey = `tenant:${user.tenantId}`;
    tenant = await cache.get<any>(tenantCacheKey);
    if (!tenant) {
      tenant = await Tenant.findById(user.tenantId);
      if (tenant) {
        await cache.set(tenantCacheKey, tenant, 300); // Cache for 5 mins
      }
    }

    if (tenant && tenant.status === 'suspended') {
      throw new ApiError(403, 'Company account is suspended. Contact support.');
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

  res.json(
    new ApiResponse(200, 'Login successful.', {
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
        preferences: user.preferences,
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
      refreshToken: newRefreshToken,
    })
  );
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user;
  if (!user) {
    throw new ApiError(401, 'Not authenticated.');
  }

  let tenant = null;
  if (user.tenantId) {
    const tenantCacheKey = `tenant:${user.tenantId}`;
    tenant = await cache.get<any>(tenantCacheKey);
    if (!tenant) {
      tenant = await Tenant.findById(user.tenantId);
      if (tenant) {
        await cache.set(tenantCacheKey, tenant, 300); // Cache for 5 mins
      }
    }
  }

  res.json(
    new ApiResponse(200, 'Profile fetched', {
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
        preferences: user.preferences,
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
    })
  );
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user;
  if (!user) {
    throw new ApiError(401, 'Not authenticated.');
  }

  const validated = req.body;

  const updated = await User.findByIdAndUpdate(user._id, validated, { new: true });
  
  // Invalidate cache
  await cache.delete(`user:${user._id}`);
  
  res.json(new ApiResponse(200, 'Profile updated.', updated));
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;
  if (userId) {
    // 1. Mark that the desktop agent needs to log out and set offline
    await User.findByIdAndUpdate(userId, { agentNeedsLogout: true, isOnline: false });
    await cache.delete(`user:${userId}`);

    // 2. Punch out if punched in today
    const today = formatDate(new Date());
    const attendance = await Attendance.findOne({ userId, date: today });
    if (attendance && attendance.punchIn && !attendance.punchOut) {
      attendance.punchOut = {
        time: new Date(),
        ip: req.ip || '',
        location: req.body?.location || { latitude: 0, longitude: 0, address: '', accuracy: 0 },
        screenshotUrl: '',
        method: 'agent',
        isInsideGeofence: false,
      };
      const totalBreak = attendance.breaks.reduce((sum, b) => sum + (b.duration || 0), 0);
      const totalWork = calculateWorkMinutes(attendance.punchIn.time, attendance.punchOut.time);
      const idleTime = attendance.idleMinutes || 0;
      attendance.totalWorkMinutes = Math.max(0, totalWork - totalBreak - idleTime);
      attendance.totalBreakMinutes = totalBreak;
      await attendance.save();
      logger.info(`Automatically punched out user ${userId} on logout`);
    }
  }

  // 3. Blacklist refresh token if present
  const oldRefreshToken = req.cookies?.ems_refresh_token;
  if (oldRefreshToken) {
    await cache.set(`revoked_refresh:${oldRefreshToken}`, true, 30 * 24 * 60 * 60); // 30 days
  }

  res.clearCookie('ems_token', {
    path: '/',
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
  });
  res.clearCookie('ems_refresh_token', {
    path: '/',
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
  });
  res.json(new ApiResponse(200, 'Logged out successfully.'));
});

export const uploadAvatarController = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user;
  if (!user) {
    throw new ApiError(401, 'Not authenticated.');
  }

  const file = req.file;
  if (!file) {
    throw new ApiError(400, 'No file provided.');
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
  await cache.delete(`user:${user._id}`);

  res.json(
    new ApiResponse(200, 'Avatar uploaded successfully.', {
      avatar: updatedUser?.avatar,
    })
  );
});

export const refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  let token = req.cookies?.ems_refresh_token;
  if (!token) {
    token = (req.headers['x-refresh-token'] as string) || req.body?.refreshToken;
  }

  if (!token) {
    throw new ApiError(401, 'Refresh token not found.');
  }

  // Check Redis blacklist
  const isBlacklisted = await cache.get(`revoked_refresh:${token}`);
  if (isBlacklisted) {
    throw new ApiError(401, 'Refresh token has been revoked.');
  }

  const decoded = jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;

  const user = await User.findById(decoded.userId);
  if (!user || user.status !== 'active') {
    throw new ApiError(401, 'Invalid token or user inactive.');
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

  res.json(
    new ApiResponse(200, 'Token refreshed successfully.', {
      accessToken,
      refreshToken: newRefreshToken,
    })
  );
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  // Password strength check
  const strength = checkPasswordStrength(newPassword, [req.user!.name, req.user!.email]);
  if (!strength.isStrong) {
    throw new ApiError(400, strength.feedback || 'New password is too weak.');
  }

  const user = await User.findById(req.user!._id).select('+password');
  if (!user) {
    throw new ApiError(401, 'Not authenticated.');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(401, 'Current password is incorrect.');
  }

  user.password = newPassword;
  await user.save();

  res.json(new ApiResponse(200, 'Password changed successfully.'));
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });

  const genericResponse = new ApiResponse(200, 'If an account with that email exists, a password reset link has been sent.', {});

  if (!user) {
    res.json(genericResponse);
    return;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  await cache.set(`password_reset:${hashedToken}`, String(user._id), 60 * 60);

  const resetLink = `${config.frontendUrl}/reset-password?token=${rawToken}`;
  const result = await sendEmail({
    to: user.email,
    subject: 'Reset your EMS password',
    html: passwordResetTemplate(user.name, resetLink),
  });

  if (result.previewUrl) {
    res.json(new ApiResponse(200, 'If an account with that email exists, a password reset link has been sent.', { _sandboxPreviewUrl: result.previewUrl }));
    return;
  }

  res.json(genericResponse);
});

export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body;

  const strength = checkPasswordStrength(newPassword, []);
  if (!strength.isStrong) {
    throw new ApiError(400, strength.feedback || 'Password is too weak.');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const userId = await cache.get(`password_reset:${hashedToken}`);

  if (!userId) {
    throw new ApiError(400, 'Reset link is invalid or has expired.');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  user.password = newPassword;
  await user.save();

  await cache.delete(`password_reset:${hashedToken}`);

  sendEmail({
    to: user.email,
    subject: 'Your EMS password was changed',
    html: passwordChangedTemplate(user.name),
  }).catch(() => {});

  res.json(new ApiResponse(200, 'Password has been reset successfully. You can now log in.', {}));
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    throw new ApiError(400, 'Token is required.');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const userId = await cache.get(`email_verify:${hashedToken}`);

  let user;
  if (userId) {
    user = await User.findById(userId).select('+emailVerificationTokenHash +emailVerificationExpiry');
  } else {
    user = await User.findOne({
      emailVerificationTokenHash: hashedToken,
      emailVerificationExpiry: { $gt: new Date() },
    }).select('+emailVerificationTokenHash +emailVerificationExpiry');
  }

  if (!user) {
    throw new ApiError(400, 'Verification token is invalid or has expired.');
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: { isEmailVerified: true },
      $unset: { emailVerificationTokenHash: 1, emailVerificationExpiry: 1 }
    }
  );
  
  if (user.tenantId) {
    await Tenant.findByIdAndUpdate(user.tenantId, { isEmailVerified: true });
  }

  await cache.delete(`email_verify:${hashedToken}`);
  
  sendEmail({
    to: user.email,
    subject: 'Welcome to EMS',
    html: welcomeEmailTemplate(user.name, 'EMS'),
  }).catch((err: any) => logger.error('Failed to send welcome email after verification:', err));

  res.json(new ApiResponse(200, 'Email verified successfully. You can now log in.', {}));
});

export const resendVerification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, 'Email is required.');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    res.json(new ApiResponse(200, 'If an account with that email exists, a verification link has been sent.', {}));
    return;
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, 'Email is already verified.');
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  await cache.set(`email_verify:${hashedToken}`, String(user._id), 24 * 60 * 60);

  await User.updateOne(
    { _id: user._id },
    { 
      emailVerificationTokenHash: hashedToken,
      emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  );

  const verifyLink = `${config.frontendUrl}/verify-email?token=${rawToken}`;
  
  sendEmail({
    to: user.email,
    subject: 'Welcome to EMS - Verify Your Email',
    html: verificationEmailTemplate(user.name, verifyLink),
  }).catch((err: any) => logger.error('Failed to send verification email:', err));

  res.json(new ApiResponse(200, 'If an account with that email exists, a verification link has been sent.', {}));
});

export const onboarding = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user;
  if (!user || user.role !== 'company_admin') {
    throw new ApiError(403, 'Only company_admin can complete onboarding.');
  }

  const { expectedEmployeeCount, departments } = req.body;
  if (!expectedEmployeeCount || !Array.isArray(departments)) {
    throw new ApiError(400, 'Invalid onboarding payload.');
  }

  const tenant = await Tenant.findById(user.tenantId);
  if (!tenant) {
    throw new ApiError(404, 'Tenant not found.');
  }

  // Create departments
  const departmentDocs = departments.map((d: any) => ({
    name: d.name,
    tenantId: tenant._id,
  }));
  if (departmentDocs.length > 0) {
    await Department.insertMany(departmentDocs);
  }

  // Update tenant
  tenant.settings.maxEmployees = Number(expectedEmployeeCount);
  tenant.onboardingCompleted = true;
  await tenant.save();
  await cache.delete(`tenant:${tenant._id}`);

  res.json(new ApiResponse(200, 'Onboarding completed successfully.'));
});

export const verifyEmailChange = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    throw new ApiError(400, 'Token is required.');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  let target: any = await User.findOne({
    emailVerificationTokenHash: hashedToken,
    emailVerificationExpiry: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationExpiry +pendingEmail');

  if (!target) {
    target = await Tenant.findOne({
      emailVerificationTokenHash: hashedToken,
      emailVerificationExpiry: { $gt: new Date() },
    }).select('+emailVerificationTokenHash +emailVerificationExpiry +pendingEmail');
  }

  if (!target || !target.pendingEmail) {
    throw new ApiError(400, 'Verification token is invalid or has expired.');
  }

  target.email = target.pendingEmail;
  target.pendingEmail = undefined;
  target.emailVerificationTokenHash = undefined;
  target.emailVerificationExpiry = undefined;
  await target.save();

  res.json(new ApiResponse(200, 'Email updated successfully. You can now use your new email.'));
});
