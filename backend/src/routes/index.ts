import { Router } from "express";
import { authRoutes } from "../modules/auth";
import { userRoutes } from "../modules/users";
import { attendanceRoutes } from "../modules/attendance";
import { screenshotRoutes } from "../modules/screenshots";
import { activityRoutes } from "../modules/activity";
import { dashboardRoutes } from "../modules/dashboard";
import { projectRoutes } from "../modules/projects";
import { settingsRoutes } from "../modules/settings";
import { companyRoutes } from "../modules/companies";
import { desktopRoutes } from "../modules/desktop";
import { locationRoutes } from "../modules/location";
import { mobileRoutes } from "../modules/mobile";
import { taskRoutes } from "../modules/tasks";
import { productivityRoutes } from "../modules/productivity";

const router = Router();

router.use("/auth", authRoutes);
router.use("/employees", userRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/screenshots", screenshotRoutes);
router.use("/activity", activityRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/projects", projectRoutes);
router.use("/settings", settingsRoutes);
router.use("/tenants", companyRoutes);
router.use("/agent", desktopRoutes);
router.use("/location", locationRoutes);
router.use("/mobile", mobileRoutes);
router.use("/tasks", taskRoutes);
router.use("/productivity", productivityRoutes);

export default router;
