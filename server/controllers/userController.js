const User = require("../models/User");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * Generate User Activity Report
 * @route GET /api/admin/activity-report
 * @access Private/Admin
 */
exports.generateActivityReport = async (req, res) => {
  try {
    // Parse and validate date parameters
    const { startDate, endDate } = req.query;

    const queryFilter = {};

    // Add date range filters if provided
    if (startDate || endDate) {
      queryFilter.updatedAt = {};

      if (startDate) {
        queryFilter.updatedAt.$gte = new Date(startDate);
      }

      if (endDate) {
        // Add 1 day to include the entire end date
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        queryFilter.updatedAt.$lt = nextDay;
      }
    }

    // Run multiple aggregation pipelines in parallel
    const [loginStats, userStatusStats, roleSummary, twoFASummary] =
      await Promise.all([
        // 1. Login statistics
        User.aggregate([
          { $match: queryFilter },
          {
            $group: {
              _id: null,
              totalLogins: { $sum: "$loginCount" },
              totalFailedAttempts: { $sum: "$failedLoginAttempts" },
              avgLoginsPerUser: { $avg: "$loginCount" },
              usersNeverLoggedIn: {
                $sum: { $cond: [{ $eq: ["$loginCount", 0] }, 1, 0] },
              },
            },
          },
        ]),

        // 2. User status breakdown
        User.aggregate([
          { $match: queryFilter },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              status: "$_id",
              count: 1,
              _id: 0,
            },
          },
        ]),

        // 3. Role distribution summary
        User.aggregate([
          { $match: queryFilter },
          { $unwind: "$roles" },
          {
            $lookup: {
              from: "roles",
              localField: "roles.role",
              foreignField: "_id",
              as: "roleInfo",
            },
          },
          { $unwind: "$roleInfo" },
          {
            $group: {
              _id: "$roleInfo.name",
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              roleName: "$_id",
              count: 1,
              _id: 0,
            },
          },
        ]),

        // 4. 2FA statistics
        User.aggregate([
          { $match: queryFilter },
          {
            $group: {
              _id: "$otpEnabled",
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              twoFAEnabled: "$_id",
              count: 1,
              _id: 0,
            },
          },
        ]),
      ]);

    // If date range specified, get daily login activity
    let dailyActivity = [];
    if (startDate && endDate) {
      dailyActivity = await User.aggregate([
        {
          $match: {
            lastLoginAt: {
              $gte: new Date(startDate),
              $lt: new Date(
                new Date(endDate).setDate(new Date(endDate).getDate() + 1)
              ),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$lastLoginAt" },
            },
            loginCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: "$_id",
            loginCount: 1,
            _id: 0,
          },
        },
      ]);
    }

    // Structure the final report
    const report = {
      generatedAt: new Date(),
      period: {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
      overview: {
        totalLogins: loginStats[0]?.totalLogins || 0,
        totalFailedAttempts: loginStats[0]?.totalFailedAttempts || 0,
        avgLoginsPerUser: loginStats[0]?.avgLoginsPerUser?.toFixed(2) || 0,
        usersNeverLoggedIn: loginStats[0]?.usersNeverLoggedIn || 0,
      },
      userStatusDistribution: userStatusStats,
      roleDistribution: roleSummary,
      twoFAAdoption: {
        enabled:
          twoFASummary.find((item) => item.twoFAEnabled === true)?.count || 0,
        disabled:
          twoFASummary.find((item) => item.twoFAEnabled === false)?.count || 0,
      },
      dailyActivity: dailyActivity,
    };

    res.json({ success: true, report });
  } catch (error) {
    console.error("Error generating activity report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate activity report",
      error: error.message,
    });
  }
};

/**
 * Get Active User Overview - For real-time dashboard data
 * @route GET /api/admin/active-users-overview
 * @access Private/Admin
 */
exports.getActiveUsersOverview = async (req, res) => {
  try {
    // Get current active users count (logged in within last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const activeUsersCount = await User.countDocuments({
      lastLoginAt: { $gte: oneDayAgo },
      status: "active",
    });

    // Get users with high failed login attempts (potential security issues)
    const usersWithFailedLogins = await User.countDocuments({
      failedLoginAttempts: { $gt: 3 },
      lockUntil: { $gt: new Date() },
    });

    res.json({
      success: true,
      overview: {
        activeUsersLast24Hours: activeUsersCount,
        potentialSecurityIssues: usersWithFailedLogins,
      },
    });
  } catch (error) {
    console.error("Error getting active users overview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get active users overview",
      error: error.message,
    });
  }
};

/**
 * Download User Activity Report in specified format
 * @route GET /api/admin/download-activity-report
 * @access Private/Admin
 */
exports.downloadActivityReport = async (req, res) => {
  try {
    const { format, startDate, endDate } = req.query;

    if (!format || !["csv", "json", "excel"].includes(format)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or missing format parameter. Use 'csv', 'json', or 'excel'.",
      });
    }

    // Get basic user data for the report
    const query = {};
    if (startDate || endDate) {
      query.updatedAt = {};
      if (startDate) query.updatedAt.$gte = new Date(startDate);
      if (endDate) {
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query.updatedAt.$lt = nextDay;
      }
    }

    const users = await User.find(query)
      .select(
        "name email mobile status loginCount failedLoginAttempts lastLoginAt otpEnabled createdAt updatedAt"
      )
      .lean();

    // Handle different formats
    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=user_activity_report_${new Date()
          .toISOString()
          .slice(0, 10)}.json`
      );
      return res.json(users);
    } else if (format === "csv") {
      // Simple CSV conversion
      const csv = generateCSV(users);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=user_activity_report_${new Date()
          .toISOString()
          .slice(0, 10)}.csv`
      );
      return res.send(csv);
    } else if (format === "excel") {
      // For Excel, we'd typically use a library like 'exceljs' or 'xlsx'
      // For this implementation, we'll return CSV with a note
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=user_activity_report_${new Date()
          .toISOString()
          .slice(0, 10)}.csv`
      );
      const csv = generateCSV(users);
      return res.send(csv);
    }
  } catch (error) {
    console.error("Error downloading activity report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download activity report",
      error: error.message,
    });
  }
};

// Helper function to generate CSV from array of objects
function generateCSV(data) {
  if (!data || !data.length) return "";

  // Extract headers from first object
  const headers = Object.keys(data[0]);

  // Create CSV header row
  let csv = headers.join(",") + "\n";

  // Add data rows
  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header];

      // Handle different types of values
      if (value === null || value === undefined) return "";
      if (value instanceof Date) return value.toISOString();
      if (typeof value === "object")
        return JSON.stringify(value).replace(/,/g, ";").replace(/"/g, '""');

      // Escape commas and quotes for CSV
      return String(value).replace(/"/g, '""');
    });

    // Wrap each value in quotes to handle commas and special characters
    csv += values.map((v) => `"${v}"`).join(",") + "\n";
  });

  return csv;
}

/**
 * Get All Users with statistics and role info
 * @route GET /api/admin/users
 * @access Private/Admin
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select(
        "name email mobile nic status roles loginCount lastLoginAt createdAt otpEnabled failedLoginAttempts doctorInfo"
      )
      .populate({
        path: "roles.role",
        select: "name",
      })
      .sort({ createdAt: -1 }) // Sort by creation date, newest first
      .lean();

    // Get user statistics for dashboard cards
    const [totalStats, roleStats] = await Promise.all([
      // Count users by status
      User.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      // Count users by role
      User.aggregate([
        { $unwind: "$roles" },
        {
          $lookup: {
            from: "roles",
            localField: "roles.role",
            foreignField: "_id",
            as: "roleInfo",
          },
        },
        { $unwind: "$roleInfo" },
        {
          $group: {
            _id: "$roleInfo.name",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            roleName: "$_id",
            count: 1,
            _id: 0,
          },
        },
      ]),
    ]);

    // Process users to format role information
    const formattedUsers = users.map((user) => ({
      ...user,
      roles: user.roles.map((r) => ({
        id: r.role._id,
        name: r.role.name,
      })),
      primaryRole: user.roles[0]?.role?.name || "No Role",
    }));

    // Calculate counts for cards
    const totalUsers = formattedUsers.length;
    const doctorCount =
      roleStats.find((r) => r.roleName === "sys_doctor")?.count || 0;
    const patientCount =
      roleStats.find((r) => r.roleName === "sys_patient")?.count || 0;
    const otherUsers = totalUsers - (doctorCount + patientCount);

    res.status(200).json({
      success: true,
      users: formattedUsers,
      stats: {
        totalUsers,
        doctorCount,
        patientCount,
        otherUsers,
        statuses: totalStats,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

/**
 * Get single user detail
 * @route GET /api/admin/users/:userId
 * @access Private/Admin
 */
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const user = await User.findById(userId)
      .select("-password")
      .populate({
        path: "roles.role",
        select: "name permissions",
      })
      .populate({
        path: "roles.assignedBy",
        select: "name email",
      })
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
      error: error.message,
    });
  }
};

/**
 * Update user status (active, inactive, suspended)
 * @route PATCH /api/admin/users/:userId/status
 * @access Private/Admin
 */
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!["active", "inactive", "suspended", "pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Must be one of: active, inactive, suspended, pending",
      });
    }

    // Get user with role information to check if they're a doctor
    const user = await User.findById(userId)
      .select("name email status roles")
      .populate({
        path: "roles.role",
        select: "name",
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Store previous status to detect status changes
    const previousStatus = user.status;

    // Update the status
    user.status = status;
    await user.save();

    // Check if this is a doctor account
    const isDoctor = user.roles.some((role) => role.role.name === "sys_doctor");

    // Handle email notifications for doctor registration status changes
    if (isDoctor && user.email) {
      // Import email notification utilities
      const {
        sendDoctorApprovalEmail,
        sendDoctorRejectionEmail,
      } = require("../utils/emailNotificationUtils");

      // If status changed from 'pending' to 'active' - send approval email
      if (previousStatus === "pending" && status === "active") {
        try {
          await sendDoctorApprovalEmail(user.email, user.name);
          console.log(
            `Approval email sent to doctor ${user.name} (${user.email})`
          );
        } catch (emailError) {
          console.error("Error sending approval email:", emailError);
          // Don't fail the request if email fails
        }
      }

      // If status changed from 'pending' to 'suspended' - send rejection email
      if (previousStatus === "pending" && status === "suspended") {
        try {
          await sendDoctorRejectionEmail(user.email, user.name);
          console.log(
            `Rejection email sent to doctor ${user.name} (${user.email})`
          );
        } catch (emailError) {
          console.error("Error sending rejection email:", emailError);
          // Don't fail the request if email fails
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: error.message,
    });
  }
};

/**
 * Reset user's password
 * @route POST /api/admin/users/:userId/reset-password
 * @access Private/Admin
 */
exports.resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear any failed login attempts
    const user = await User.findByIdAndUpdate(
      userId,
      {
        password: hashedPassword,
        failedLoginAttempts: 0,
        lockUntil: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
      { new: true }
    ).select("name email");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User password has been reset successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error resetting user password:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset user password",
      error: error.message,
    });
  }
};

/**
 * Toggle 2FA for user
 * @route PATCH /api/admin/users/:userId/toggle-2fa
 * @access Private/Admin
 */
exports.toggleUserTwoFA = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("name email otpEnabled");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Toggle the 2FA status
    user.otpEnabled = !user.otpEnabled;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Two-factor authentication has been ${
        user.otpEnabled ? "enabled" : "disabled"
      } for user`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        otpEnabled: user.otpEnabled,
      },
    });
  } catch (error) {
    console.error("Error toggling user 2FA:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle two-factor authentication",
      error: error.message,
    });
  }
};

/**
 * Delete a user permanently
 * @route DELETE /api/admin/users/:userId
 * @access Private/Admin
 */
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Perform the actual deletion
    await User.findByIdAndDelete(userId);

    // Return success message
    res.status(200).json({
      success: true,
      message: `User ${user.name} has been permanently deleted`,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};
