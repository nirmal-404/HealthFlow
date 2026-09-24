const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  registerPatient,
  registerDoctor,
  registerOtherRoles,
  login,
  verifyOtp,
  getMe,
  switchRole,
  toggle2FA,
  get2FAStatus,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  logout, // Add the logout function
} = require("../controllers/authController");

// Log route accesses
router.post(
  "/register/patient",
  (req, res, next) => {
    console.log("[AuthRoutes] Register patient route accessed");
    next();
  },
  registerPatient
);

router.post(
  "/register/doctor",
  (req, res, next) => {
    console.log("[AuthRoutes] Register doctor route accessed");
    next();
  },
  registerDoctor
);

router.post(
  "/register/staff",
  (req, res, next) => {
    console.log("[AuthRoutes] Register custom route accessed");
    next();
  },
  registerOtherRoles
);

router.post(
  "/login",
  (req, res, next) => {
    console.log(
      "[AuthRoutes] Login route accessed with identifier:",
      req.body.identifier
    );
    next();
  },
  login
);

// New route for OTP verification
router.post(
  "/verify-otp",
  (req, res, next) => {
    console.log("[AuthRoutes] Verify OTP route accessed");
    next();
  },
  verifyOtp
);

router.get(
  "/me",
  protect,
  (req, res, next) => {
    console.log(
      "[AuthRoutes] Accessing current user info for userId:",
      req.user.id
    );
    next();
  },
  getMe
);

router.post(
  "/switch-role",
  protect,
  (req, res, next) => {
    console.log("[AuthRoutes] Switch role route accessed");
    next();
  },
  switchRole
);

// Two-factor authentication routes
router.post(
  "/toggle-2fa",
  protect,
  (req, res, next) => {
    console.log("[AuthRoutes] Toggle 2FA route accessed");
    next();
  },
  toggle2FA
);

router.get(
  "/2fa-status",
  protect,
  (req, res, next) => {
    console.log("[AuthRoutes] Get 2FA status route accessed");
    next();
  },
  get2FAStatus
);

// Password reset routes
router.post(
  "/forgot-password",
  (req, res, next) => {
    console.log("[AuthRoutes] Forgot password route accessed");
    next();
  },
  forgotPassword
);

router.post(
  "/reset-password",
  (req, res, next) => {
    console.log("[AuthRoutes] Reset password route accessed");
    next();
  },
  resetPassword
);

// Logout endpoint
router.post(
  "/logout",
  protect,
  (req, res, next) => {
    console.log("[AuthRoutes] Logout route accessed for user:", req.user.id);
    next();
  },
  logout
);

router.get(
  "/verify-reset-token",
  (req, res, next) => {
    console.log("[AuthRoutes] Verify reset token route accessed");
    next();
  },
  verifyResetToken
);

module.exports = router;
