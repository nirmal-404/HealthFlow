const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect, checkPermission } = require("../middleware/authMiddleware");

// All routes are protected and require admin permissions
router.use(protect);

// Admin dashboard and reporting routes
router.get(
  "/activity-report",
  checkPermission("user", "view", "all"),
  userController.generateActivityReport
);

router.get(
  "/active-users-overview",
  checkPermission("user", "view", "all"),
  userController.getActiveUsersOverview
);

router.get(
  "/download-activity-report",
  checkPermission("user", "view", "all"),
  userController.downloadActivityReport
);

// User management routes
router.get(
  "/",
  checkPermission("user", "view", "all"),
  userController.getAllUsers
);

router.get(
  "/:userId",
  checkPermission("user", "view", "all"),
  userController.getUserById
);

router.patch(
  "/:userId/status",
  checkPermission("user", "update", "all"),
  userController.updateUserStatus
);

router.post(
  "/:userId/reset-password",
  checkPermission("user", "update", "all"),
  userController.resetUserPassword
);

router.patch(
  "/:userId/toggle-2fa",
  checkPermission("user", "update", "all"),
  userController.toggleUserTwoFA
);

router.delete(
  "/:userId",
  checkPermission("user", "delete", "all"),
  userController.deleteUser
);

module.exports = router;
