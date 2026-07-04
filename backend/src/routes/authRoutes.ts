import { Router } from 'express';
import { register, login, getMe, updateProfile, logout, uploadAvatarController, refreshToken, changePassword } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { uploadAvatar } from '../middleware/upload';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);
router.post('/avatar', authenticate, uploadAvatar.single('avatar'), uploadAvatarController);
router.post('/logout', authenticate, logout);
router.post('/refresh-token', refreshToken);

export default router;
