import { Router } from 'express';

// ── Import all module routers from src/modules/ ──────────────────────────────
import authRoutes from '../modules/auth/auth.routes';
import employeeRoutes from '../modules/employee/employee.routes';
import attendanceRoutes from '../modules/attendance/attendance.routes';
import screenshotRoutes from '../modules/screenshot/screenshot.routes';
import activityRoutes from '../modules/activity/activity.routes';
import dashboardRoutes from '../modules/dashboard';
import projectRoutes from '../modules/project/project.routes';
import settingsRoutes from '../modules/settings/settings.routes';
import tenantRoutes from '../modules/tenant/tenant.routes';
import agentRoutes from '../modules/agent/agent.routes';
import locationRoutes from '../modules/location/location.routes';
import mobileRoutes from '../modules/mobile/mobile.routes';
import taskRoutes from '../modules/task/task.routes';
import productivityRoutes from '../modules/productivity/productivity.routes';
import leaveRoutes from '../modules/leave/leave.routes';
import notificationRoutes from '../modules/notification/notification.routes';
import reportRoutes from '../modules/report/report.routes';
import managerRoutes from '../modules/manager/manager.routes';
import companyRoutes from '../modules/company/company.routes';
import auditRoutes from '../modules/audit/audit.routes';
import subscriptionRoutes from '../modules/subscription/subscription.routes';
import departmentRoutes from '../modules/department/department.routes';

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
router.use('/location', locationRoutes);
router.use('/mobile', mobileRoutes);
router.use('/tasks', taskRoutes);
router.use('/productivity', productivityRoutes);
router.use('/leaves', leaveRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/managers', managerRoutes);
router.use('/company', companyRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/departments', departmentRoutes);

export default router;
