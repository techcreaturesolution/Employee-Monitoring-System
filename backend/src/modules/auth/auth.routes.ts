import { Router } from "express";
import {
  register,
  login,
  getMe,
  updateProfile,
  logout,
  uploadAvatarController,
  refreshToken,
} from "./auth.controller";
import { authenticate } from "../../middleware/auth";
import { uploadAvatar } from "../../middleware/upload";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getMe);
router.put("/profile", authenticate, updateProfile);
router.post(
  "/avatar",
  authenticate,
  uploadAvatar.single("avatar"),
  uploadAvatarController
);
router.post("/logout", authenticate, logout);
router.post("/refresh-token", refreshToken);

export default router;
