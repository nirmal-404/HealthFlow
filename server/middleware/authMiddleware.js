const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  getPermissionsFromCache,
  setPermissionsInCache,
} = require("../utils/cacheUtil");

exports.protect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Not authorized to access this route" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.userId || !decoded?.activeRoleId) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Get user with populated role details
    const user = await User.findById(decoded.userId)
      .populate({
        path: "roles.role",
        select: "name permissions isSystem createdBy",
        populate: {
          path: "createdBy",
          select: "_id name",
        },
      })
      .populate("roles.assignedBy", "_id name");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Find active role
    const activeRole = user.roles.find(
      (r) => r.role._id.toString() === decoded.activeRoleId
    );
    if (!activeRole) {
      return res.status(401).json({ message: "Active role not found" });
    }

    // Get permissions from cache or set them if not found - updated to use async function
    let permissions = await getPermissionsFromCache(activeRole.role._id);
    if (!permissions) {
      permissions = activeRole.role.permissions;
      // Store permissions in cache for future use
      await setPermissionsInCache(activeRole.role._id, permissions);
    }

    // Set base user info
    req.user = {
      id: user._id,
      name: user.name,
      roleId: activeRole.role._id, // Add roleId here for logout function
      activeRole: {
        id: activeRole.role._id,
        name: activeRole.role.name,
        permissions: permissions,
      },
    };

    // Handle data access context based on role type
    if (activeRole.role.name === "sys_doctor") {
      // If user is a doctor, they access their own data
      req.dataAccess = {
        doctorId: user._id,
        accessType: "direct",
      };
    } else if (!activeRole.role.isSystem) {
      // For custom roles, check who created/assigned the role
      const creatingDoctor = activeRole.role.createdBy;
      if (!creatingDoctor) {
        return res.status(403).json({
          message: "Invalid role configuration - no creating doctor found",
        });
      }

      // Set up delegated access context
      req.dataAccess = {
        doctorId: creatingDoctor._id,
        accessType: "delegated",
        delegatedBy: creatingDoctor.name,
      };
    }

    next();
  } catch (error) {
    console.error("[AuthMiddleware] Error:", error);
    res.status(401).json({ message: "Not authorized to access this route" });
  }
};

exports.checkPermission = (entity, action, scopes = ["all"]) => {
  // Convert single scope string to array for backward compatibility
  const scopeArray = Array.isArray(scopes) ? scopes : [scopes];

  return (req, res, next) => {
    console.log(
      `[Permission Check] Checking permission for ${action} on ${entity} with scopes ${scopeArray.join(
        ", "
      )}`
    );

    const permissions = req.user?.activeRole?.permissions;
    if (!permissions) {
      console.log(
        `[Permission Check] DENIED - No permissions available for user ${req.user?.id}`
      );
      return res.status(403).json({
        message: "No permissions available",
      });
    }

    console.log(
      `[Permission Check] Found ${permissions.length} permissions for role ${req.user.activeRole.name} (${req.user.activeRole.id})`
    );

    const hasPermission = permissions.some((p) => {
      // Check if permission entity and action match
      const entityActionMatch = p.entity === entity && p.action === action;

      // If entity and action match, check if any of the scopes match
      if (entityActionMatch) {
        // Permission allows all scopes
        if (p.scope === "all") {
          console.log(
            `[Permission Check] MATCHED permission with 'all' scope: ${p.entity}.${p.action}.${p.scope}`
          );
          return true;
        }

        // Check if the permission scope matches any of the required scopes
        const scopeMatches = scopeArray.includes(p.scope);

        if (scopeMatches) {
          console.log(
            `[Permission Check] MATCHED permission with specific scope: ${p.entity}.${p.action}.${p.scope}`
          );
          return true;
        }
      }

      return false;
    });

    if (!hasPermission) {
      console.log(
        `[Permission Check] DENIED - User ${
          req.user.id
        } lacks permission to ${action} ${entity} with scopes ${scopeArray.join(
          ", "
        )}`
      );
      return res.status(403).json({
        message: `You do not have permission to ${action} ${entity}`,
      });
    }

    console.log(
      `[Permission Check] GRANTED - User ${
        req.user.id
      } authorized to ${action} ${entity} with scope in [${scopeArray.join(
        ", "
      )}]`
    );

    // Check if the action requires doctor context
    const requiresDoctorContext =
      ["view", "create", "update", "delete"].includes(action) &&
      ["patient", "appointment", "prescription"].includes(entity);

    if (requiresDoctorContext && !req.dataAccess?.doctorId) {
      console.log(
        `[Permission Check] DENIED - Missing doctor context for ${action} on ${entity}`
      );
      return res.status(403).json({
        message: "This action requires doctor context",
      });
    }

    next();
  };
};
