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
} from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { uploadAvatar } from '../../middleware/upload';
import { validate } from '../../middleware/validate';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from './auth.validation';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.put('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/avatar', authenticate, uploadAvatar.single('avatar'), uploadAvatarController);
router.post('/logout', authenticate, logout);
router.post('/refresh-token', refreshToken);

export default router;
