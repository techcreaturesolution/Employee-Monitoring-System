import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  logout,
  uploadAvatarController,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
} from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { uploadAvatar } from '../../middleware/upload';
import { validate } from '../../middleware/validate';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation';
import rateLimit from 'express-rate-limit';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.put('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/avatar', authenticate, uploadAvatar.single('avatar'), uploadAvatarController);
router.post('/logout', authenticate, logout);
router.post('/refresh-token', refreshToken);

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many password reset requests. Please try again later.' },
});

router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

export default router;
