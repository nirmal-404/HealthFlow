const User = require("../models/User");
const Role = require("../models/Role"); // Import Role model
const bcrypt = require("bcryptjs");
const { generateAccessToken } = require("../utils/jwt");
const { getRolesAndActiveRole } = require("../utils/roleUtils");
const {
  removePermissionsFromCache,
  setPermissionsInCache,
} = require("../utils/cacheUtil");
const PreRegisteredUser = require("../models/PreRegisteredUser");
const { generateOTP, verifyOTP, sendOTPEmail } = require("../utils/otpUtils");
const {
  generateResetToken,
  sendPasswordResetEmail,
} = require("../utils/passwordResetUtils");

// Login User - Step 1: Verify credentials and send OTP
exports.login = async (req, res) => {
  const { identifier, password } = req.body;

  console.log(
    "[AuthController] Login request received. Identifier:",
    identifier
  );

  try {
    // Fetch user from the database based on email or NIC
    const user = await User.findOne({
      $or: [{ email: identifier }, { nic: identifier }],
    });

    if (!user) {
      console.log("[AuthController] Login failed: User not found");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Block traditional login for OAuth users
    if (user.authType !== "traditional") {
      console.log(
        "[AuthController] Login failed: OAuth user attempting traditional login"
      );
      return res.status(400).json({
        message: `This account uses ${user.authType} authentication. Please login with ${user.authType}.`,
      });
    }

    // Check if password matches
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log("[AuthController] Login failed: Password mismatch");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if login is via NIC or if 2FA is disabled - skip OTP if true
    const isNICLogin = !!user.nic && user.nic === identifier;
    const is2FADisabled = user.otpEnabled === false;

    if (isNICLogin || is2FADisabled) {
      // Log the reason for skipping OTP
      if (isNICLogin) {
        console.log(
          "[AuthController] NIC login detected, skipping OTP verification"
        );
      } else {
        console.log(
          "[AuthController] 2FA is disabled for user, skipping OTP verification"
        );
      }

      // Fetch the user's roles and active role
      const { activeRole } = await getRolesAndActiveRole(user);

      if (!activeRole || !activeRole.role.permissions) {
        console.log(
          "[AuthController] Login failed: User role or permissions not found"
        );
        return res
          .status(403)
          .json({ message: "User role or permissions not found" });
      }

      console.log("[AuthController] Login successful for user:", user._id);
      const accessToken = generateAccessToken(user._id, activeRole.role._id);

      // Update to use async cache function
      await setPermissionsInCache(
        activeRole.role._id,
        activeRole.role.permissions
      );

      return res.status(200).json({
        accessToken,
        user: {
          id: user._id,
          name: user.name,
        },
        activeRole: {
          id: activeRole.role._id,
          name: activeRole.role.name,
          permissions: activeRole.role.permissions,
        },
      });
    }

    // For email login with 2FA enabled, generate and send OTP
    if (!user.email) {
      console.log("[AuthController] Email login but no email found for user");
      return res.status(400).json({
        message: "Cannot send OTP - no email associated with account",
      });
    }

    // Generate a new 6-digit OTP
    const generatedOTP = generateOTP();

    // Store OTP with 5-minute expiry time
    await User.findByIdAndUpdate(user._id, {
      otpSecret: generatedOTP,
      verificationTokenExpires: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    console.log(
      "[AuthController] Generated OTP and stored with 5-minute expiry"
    );

    // Send OTP via email
    await sendOTPEmail(user.email, generatedOTP);
    console.log("[AuthController] OTP sent to email:", user.email);

    // Return success message - do not issue token yet
    return res.status(200).json({
      success: true,
      message: "OTP sent to your email.",
      requiresOTP: true,
      userId: user._id, // Sending userId to be used in verify-otp endpoint
    });
  } catch (error) {
    console.error("[AuthController] Login error:", error);
    res
      .status(500)
      .json({ message: "Internal error", errorDetails: error.message });
  }
};

// Step 2: Verify OTP and complete login
exports.verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;

  console.log("[AuthController] OTP verification request received");

  if (!userId || !otp) {
    console.log(
      "[AuthController] OTP verification failed: Missing required fields"
    );
    return res.status(400).json({ message: "User ID and OTP are required" });
  }

  try {
    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      console.log("[AuthController] OTP verification failed: User not found");
      return res.status(404).json({ message: "User not found" });
    }

    // Check if OTP exists and is not expired
    if (!user.otpSecret || !user.verificationTokenExpires) {
      console.log(
        "[AuthController] OTP verification failed: No OTP found or never requested"
      );
      return res
        .status(400)
        .json({ message: "OTP not found or never requested" });
    }

    const isExpired = new Date() > user.verificationTokenExpires;
    if (isExpired) {
      console.log("[AuthController] OTP verification failed: OTP expired");
      return res
        .status(401)
        .json({ message: "OTP has expired. Please request a new one" });
    }

    // Verify OTP
    if (user.otpSecret !== otp) {
      console.log("[AuthController] OTP verification failed: Invalid OTP");
      return res.status(401).json({ message: "Invalid OTP" });
    }

    // Clear OTP after successful verification
    user.otpSecret = null;
    user.verificationTokenExpires = null;
    await user.save();
    console.log("[AuthController] OTP verified successfully, OTP cleared");

    // Fetch the user's roles and active role
    const { activeRole } = await getRolesAndActiveRole(user);

    if (!activeRole || !activeRole.role.permissions) {
      console.log(
        "[AuthController] Login failed: User role or permissions not found"
      );
      return res
        .status(403)
        .json({ message: "User role or permissions not found" });
    }

    console.log("[AuthController] Login successful for user:", user._id);
    const accessToken = generateAccessToken(user._id, activeRole.role._id);

    // Update to use async cache function
    await setPermissionsInCache(
      activeRole.role._id,
      activeRole.role.permissions
    );

    // Return user data with token
    res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
      },
      activeRole: {
        id: activeRole.role._id,
        name: activeRole.role.name,
        permissions: activeRole.role.permissions,
      },
    });
  } catch (error) {
    console.error("[AuthController] OTP verification error:", error);
    res
      .status(500)
      .json({ message: "Internal error", errorDetails: error.message });
  }
};

// Get currently authenticated user info - UPDATED
exports.getMe = async (req, res) => {
  const userId = req.user.id;

  console.log("[AuthController] Fetching user info for userId:", userId);

  try {
    const user = await User.findById(userId).lean();
    if (!user) {
      console.log("[AuthController] getMe failed: User not found");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { populatedRoles, activeRole } = await getRolesAndActiveRole(user);

    console.log("[AuthController] getMe successful for user:", user._id);

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        roles: populatedRoles.map((r) => ({
          id: r.role._id,
          name: r.role.name,
        })),
      },
      activeRole: {
        id: activeRole.role._id,
        name: activeRole.role.name,
        permissions: activeRole.role.permissions,
      },
    });
  } catch (error) {
    console.error("[AuthController] getMe error:", error);
    res
      .status(500)
      .json({ message: "Internal error", errorDetails: error.message });
  }
};

// Register Patient - UPDATED
exports.registerPatient = async (req, res) => {
  console.log("[AuthController] Register patient request received");

  try {
    const { name, email, nic, mobile, password } = req.body;

    // Validate required fields
    if (!email && !nic) {
      console.log("[AuthController] Registration failed: Missing email or NIC");
      return res
        .status(400)
        .json({ message: "Either email or NIC is required." });
    }

    if (!name || !mobile || !password) {
      console.log(
        "[AuthController] Registration failed: Missing required fields"
      );
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [...(email ? [{ email }] : []), ...(nic ? [{ nic }] : [])],
    });

    if (existingUser) {
      console.log("[AuthController] Registration failed: User already exists");
      return res.status(400).json({ message: "You already have an account." });
    }

    // Find patient role
    const patientRole = await Role.findOne({ name: "sys_patient" });
    if (!patientRole) {
      console.log(
        "[AuthController] Registration failed: Patient role not found"
      );
      return res.status(500).json({ message: "Patient role not found." });
    }

    console.log("[AuthController] Patient role found. Creating user...");

    // Create user with otpEnabled set to true
    const user = new User({
      name,
      email: email || undefined,
      nic: nic || undefined,
      mobile,
      password: await bcrypt.hash(password, 10),
      roles: [{ role: patientRole._id }],
      lastActiveRole: patientRole._id,
      authType: "traditional",
      otpEnabled: true, // Add this line to enable OTP
    });

    await user.save();
    console.log(
      "[AuthController] Patient registration successful for user:",
      user._id
    );

    // Generate access token and set permissions in cache
    const accessToken = generateAccessToken(user._id, patientRole._id);

    // Update to use async cache function
    await setPermissionsInCache(patientRole._id, patientRole.permissions);

    // Return success without requiring OTP for new registration
    res.status(201).json({
      accessToken,
      user: { id: user._id, name: user.name },
      activeRole: {
        id: patientRole._id,
        name: patientRole.name,
        permissions: patientRole.permissions,
      },
    });
  } catch (error) {
    console.error("[AuthController] Patient registration error:", error);
    res.status(500).json({
      message: "Internal error",
      errorDetails: error.message,
    });
  }
};

// Register Doctor - UPDATED
exports.registerDoctor = async (req, res) => {
  console.log("[AuthController] Register doctor request received");

  try {
    const {
      name,
      email,
      nic,
      mobile,
      password,
      doctorInfo,
      authType = "traditional",
    } = req.body;

    // Validate required fields - doctors must have email
    if (!name || !mobile || !password || !email) {
      console.log(
        "[AuthController] Doctor registration failed: Missing required fields"
      );
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(
        "[AuthController] Doctor registration failed: Email already registered"
      );
      return res.status(400).json({ message: "Email already registered." });
    }

    // Find doctor role
    const doctorRole = await Role.findOne({ name: "sys_doctor" });
    if (!doctorRole) {
      console.log(
        "[AuthController] Doctor registration failed: Doctor role not found"
      );
      return res.status(500).json({ message: "Doctor role not found." });
    }

    console.log("[AuthController] Doctor role found. Creating user...");

    // Create user with pending status
    const user = new User({
      name,
      email,
      nic: nic || undefined,
      mobile,
      password: await bcrypt.hash(password, 10),
      roles: [{ role: doctorRole._id }],
      lastActiveRole: doctorRole._id,
      doctorInfo,
      status: "pending", // Set initial status to pending for approval
      authType: authType, // Explicitly set the authType
      otpEnabled: true, // Enable 2FA by default for doctors
    });

    await user.save();
    console.log(
      "[AuthController] Doctor registration successful for user:",
      user._id
    );

    // Return success message without token - user needs approval first
    res.status(201).json({
      success: true,
      message:
        "Your registration has been submitted successfully. You will receive an email confirmation when your account has been approved.",
      requiresApproval: true,
      authType: user.authType, // Include authType in response
    });
  } catch (error) {
    console.error("[AuthController] Doctor registration error:", error);
    res.status(500).json({
      message: "Internal error",
      errorDetails: error.message,
    });
  }
};

// Register Other Roles (Staff) - UPDATED
exports.registerOtherRoles = async (req, res) => {
  console.log("[AuthController] Register staff request received");

  try {
    const {
      name,
      email,
      nic,
      mobile,
      password,
      confirmPassword,
      authType = "traditional",
    } = req.body;

    // Validate required fields - staff must have email
    if (!name || !mobile || !password || !email || !confirmPassword) {
      console.log(
        "[AuthController] Staff registration failed: Missing required fields"
      );
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      console.log(
        "[AuthController] Staff registration failed: Passwords don't match"
      );
      return res.status(400).json({ message: "Passwords do not match." });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(
        "[AuthController] Staff registration failed: Email already registered"
      );
      return res.status(400).json({ message: "Email already registered." });
    }

    // Fetch pre-registered roles for the email
    const preregRoles = await PreRegisteredUser.find({
      email,
      isRegistered: false,
    }).populate("role assignedBy");

    if (!preregRoles.length) {
      console.log(
        "[AuthController] Staff registration failed: Not pre-registered"
      );
      return res
        .status(400)
        .json({ message: "You are not pre-registered to join the system." });
    }

    // Map roles to the User.roles format
    const userRoles = preregRoles.map((entry) => ({
      role: entry.role._id,
      assignedBy: entry.assignedBy ? entry.assignedBy._id : null,
    }));

    const activeRole = preregRoles[0].role;
    console.log(
      "[AuthController] Pre-registered roles found. Creating user..."
    );

    // Create the user with additional fields from the User schema
    const user = new User({
      name,
      email,
      nic: nic || undefined,
      mobile,
      password: await bcrypt.hash(password, 10),
      roles: userRoles,
      lastActiveRole: activeRole._id,
      authType: authType, // Use the provided authType or default to "traditional"
      otpEnabled: true, // Enable 2FA by default for staff
      status: "active", // Set status to active since they were pre-registered
      loginCount: 0,
      failedLoginAttempts: 0,
    });

    await user.save();
    console.log(
      "[AuthController] Staff registration successful for user:",
      user._id
    );

    // Update pre-registered roles as registered instead of deleting
    await PreRegisteredUser.updateMany(
      { email },
      {
        isRegistered: true,
        registeredUserId: user._id,
      }
    );
    console.log(
      "[AuthController] Updated pre-registered entries for email:",
      email
    );

    // Cache permissions and generate access token
    await setPermissionsInCache(activeRole._id, activeRole.permissions);
    const accessToken = generateAccessToken(user._id, activeRole._id);

    // Return complete user data including authType
    res.status(201).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        authType: user.authType, // Explicitly include authType in the response
      },
      activeRole: {
        id: activeRole._id,
        name: activeRole.name,
        permissions: activeRole.permissions,
      },
    });
  } catch (error) {
    console.error("[AuthController] Staff registration error:", error);
    res.status(500).json({
      message: "Internal error",
      errorDetails: error.message,
    });
  }
};

exports.switchRole = async (req, res) => {
  const userId = req.user.id;
  const { roleId } = req.body;

  console.log("[AuthController] Switch role request received", {
    userId,
    roleId,
  });

  try {
    const user = await User.findById(userId).lean();
    if (!user) {
      console.log("[AuthController] Switch role failed: User not found");
      return res.status(401).json({ message: "User not found" });
    }

    // Check if user has this role
    const hasRole = user.roles.some((r) => r.role.toString() === roleId);
    if (!hasRole) {
      console.log(
        "[AuthController] Switch role failed: User does not have this role"
      );
      return res
        .status(403)
        .json({ message: "You do not have access to this role" });
    }

    // Update user's active role
    await User.findByIdAndUpdate(userId, { lastActiveRole: roleId });

    // Get the role details
    const role = await Role.findById(roleId);
    if (!role) {
      console.log("[AuthController] Switch role failed: Role not found");
      return res.status(404).json({ message: "Role not found" });
    }

    // Set new permissions in cache and generate new token
    await setPermissionsInCache(roleId, role.permissions);
    const accessToken = generateAccessToken(userId, roleId);

    res.status(200).json({
      accessToken,
      activeRole: {
        id: role._id,
        name: role.name,
        permissions: role.permissions,
      },
    });
  } catch (error) {
    console.error("[AuthController] Switch role error:", error);
    res.status(500).json({
      message: "Internal error",
      errorDetails: error.message,
    });
  }
};

// Toggle 2FA (Two-Factor Authentication) for a user
exports.toggle2FA = async (req, res) => {
  const userId = req.user.id;

  console.log("[AuthController] Toggle 2FA request received for user:", userId);

  try {
    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      console.log("[AuthController] Toggle 2FA failed: User not found");
      return res.status(404).json({ message: "User not found" });
    }

    // Toggle 2FA status
    user.otpEnabled = !user.otpEnabled;

    // Save the updated user
    await user.save();

    console.log(
      `[AuthController] 2FA ${
        user.otpEnabled ? "enabled" : "disabled"
      } for user:`,
      userId
    );

    return res.status(200).json({
      message: `Two-factor authentication has been ${
        user.otpEnabled ? "enabled" : "disabled"
      }`,
      otpEnabled: user.otpEnabled,
    });
  } catch (error) {
    console.error("[AuthController] Toggle 2FA error:", error);
    res.status(500).json({
      message: "Failed to update two-factor authentication settings",
      errorDetails: error.message,
    });
  }
};

// Get 2FA status for a user
exports.get2FAStatus = async (req, res) => {
  const userId = req.user.id;

  console.log("[AuthController] Get 2FA status request for user:", userId);

  try {
    // Find user by ID
    const user = await User.findById(userId).select("otpEnabled");

    if (!user) {
      console.log("[AuthController] Get 2FA status failed: User not found");
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ otpEnabled: user.otpEnabled });
  } catch (error) {
    console.error("[AuthController] Get 2FA status error:", error);
    res.status(500).json({
      message: "Failed to get two-factor authentication status",
      errorDetails: error.message,
    });
  }
};

// Forgot Password - Send reset email
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  console.log("[AuthController] Forgot password request received for:", email);

  if (!email) {
    console.log("[AuthController] Forgot password failed: No email provided");
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });

    // Don't reveal if email exists or not (security best practice)
    if (!user) {
      console.log(
        "[AuthController] Forgot password: Email not found in database"
      );
      return res.status(200).json({
        message:
          "If your email exists in our system, you will receive a password reset link shortly",
      });
    }

    // Check if this is an OAuth user
    if (user.authType !== "traditional") {
      console.log(
        `[AuthController] Forgot password failed: User uses ${user.authType} authentication`
      );
      return res.status(400).json({
        message: `This account uses ${user.authType} authentication. Password reset is not available.`,
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();

    // Set token and expiry (1 hour from now)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour in milliseconds

    await user.save();
    console.log("[AuthController] Reset token saved for user:", user._id);

    // Send password reset email
    await sendPasswordResetEmail(user.email, resetToken, user._id);

    res.status(200).json({
      message:
        "If your email exists in our system, you will receive a password reset link shortly",
    });
  } catch (error) {
    console.error("[AuthController] Forgot password error:", error);
    res.status(500).json({
      message: "Failed to process password reset request",
      errorDetails:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Reset Password - Verify token and update password
exports.resetPassword = async (req, res) => {
  const { userId, token, password } = req.body;

  console.log("[AuthController] Reset password request received");

  if (!userId || !token || !password) {
    console.log(
      "[AuthController] Reset password failed: Missing required fields"
    );
    return res
      .status(400)
      .json({ message: "User ID, token and new password are required" });
  }

  try {
    // Find user by ID
    const user = await User.findById(userId);
    //const user = await User.findById(userId).select("resetPasswordToken resetPasswordExpires password");

    if (!user) {
      console.log("[AuthController] Reset password failed: User not found");
      return res
        .status(404)
        .json({ message: "Invalid or expired password reset link" });
    }

    // Check if token exists and is still valid
    if (!user.resetPasswordToken || !user.resetPasswordExpires) {
      console.log(
        "[AuthController] Reset password failed: No reset token found or never requested"
      );
      return res
        .status(400)
        .json({ message: "Invalid or expired password reset link" });
    }

    if (user.resetPasswordToken !== token) {
      console.log("[AuthController] Reset password failed: Invalid token");
      return res.status(400).json({ message: "Invalid password reset token" });
    }

    if (Date.now() > user.resetPasswordExpires) {
      console.log("[AuthController] Reset password failed: Token expired");
      return res.status(400).json({
        message: "Password reset link has expired. Please request a new one.",
      });
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;

    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    console.log(
      "[AuthController] Password reset successful for user:",
      user._id
    );

    res.status(200).json({
      message:
        "Your password has been successfully reset. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("[AuthController] Reset password error:", error);
    res.status(500).json({
      message: "Failed to reset password",
      errorDetails:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Verify reset token validity
exports.verifyResetToken = async (req, res) => {
  const { userId, token } = req.query;

  console.log("[AuthController] Verify reset token request received");

  if (!userId || !token) {
    console.log(
      "[AuthController] Verify token failed: Missing required fields"
    );
    return res
      .status(400)
      .json({ message: "User ID and token are required", valid: false });
  }

  try {
    // Find user by ID
    const user = await User.findById(userId);

    if (
      !user ||
      !user.resetPasswordToken ||
      user.resetPasswordToken !== token
    ) {
      console.log(
        "[AuthController] Verify token failed: Invalid token or user"
      );
      return res.status(200).json({ valid: false });
    }

    if (Date.now() > user.resetPasswordExpires) {
      console.log("[AuthController] Verify token failed: Token expired");
      return res.status(200).json({ valid: false });
    }

    // Token is valid
    console.log(
      "[AuthController] Reset token verified successfully for user:",
      user._id
    );
    res.status(200).json({ valid: true });
  } catch (error) {
    console.error("[AuthController] Verify reset token error:", error);
    res.status(500).json({
      message: "Failed to verify reset token",
      valid: false,
      errorDetails:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Logout user and clear cached permissions
exports.logout = async (req, res) => {
  const userId = req.user.id;
  const roleId = req.user.roleId;

  console.log("[AuthController] Logout request received for user:", userId);

  try {
    // Remove permissions from cache
    await removePermissionsFromCache(roleId);

    console.log(
      "[AuthController] Permissions removed from cache for role:",
      roleId
    );

    // Return success response
    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("[AuthController] Logout error:", error);
    res.status(500).json({
      message: "Failed to process logout",
      errorDetails:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
