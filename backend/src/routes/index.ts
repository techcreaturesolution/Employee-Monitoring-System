import { Router } from 'express';
import authRoutes from './authRoutes';
import employeeRoutes from './employeeRoutes';
import attendanceRoutes from './attendanceRoutes';
import screenshotRoutes from './screenshotRoutes';
import activityRoutes from './activityRoutes';
import dashboardRoutes from './dashboardRoutes';
import projectRoutes from './projectRoutes';
import settingsRoutes from './settingsRoutes';
import tenantRoutes from './tenantRoutes';
import agentRoutes from './agentRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/screenshots', screenshotRoutes);
router.use('/activity', activityRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/projects', projectRoutes);
router.use('/settings', settingsRoutes);
router.use('/tenants', tenantRoutes);
router.use('/agent', agentRoutes);

export default router;
