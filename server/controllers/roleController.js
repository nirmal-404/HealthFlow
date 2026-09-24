const Role = require("../models/Role");

const viewCustomRolesByDoctor = async (req, res) => {
  try {
    console.log(
      "[role controller] Fetching custom roles for current doctor..."
    );
    const doctorId = req.user.id;
    console.log("[role controller] Logged-in doctor ID:", doctorId);

    const customRoles = await Role.find({
      isSystem: false,
      createdBy: doctorId,
    });

    console.log("[role controller] Custom roles result:", customRoles);
    res.status(200).json(customRoles);
  } catch (error) {
    console.error(
      "[role controller] Error viewing custom roles by doctor:",
      error
    );
    res.status(500).json({ message: error.message });
  }
};

const createCustomRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;
    console.log("[role controller] Create role request body:", req.body);

    if (!name) {
      console.warn("[role controller] Missing role name");
      return res
        .status(400)
        .json({ message: "[role controller] Role name is required" });
    }

    let rolePermissions = permissions || [];
    console.log("[role controller] Initial permissions:", rolePermissions);

    const defaultPermissions = [
      { entity: "user", action: "view", scope: "own" },
      { entity: "user", action: "update", scope: "own" },
      { entity: "user", action: "delete", scope: "own" },
    ];

    const mergedPermissions = [...rolePermissions];

    for (const defaultPerm of defaultPermissions) {
      const exists = mergedPermissions.some(
        (perm) =>
          perm.entity === defaultPerm.entity &&
          perm.action === defaultPerm.action &&
          perm.scope === defaultPerm.scope
      );
      if (!exists) {
        console.log(
          "[role controller] Adding default permission:",
          defaultPerm
        );
        mergedPermissions.push(defaultPerm);
      }
    }

    const role = new Role({
      name,
      permissions: mergedPermissions,
      isSystem: false,
      createdBy: req.user.id,
    });

    console.log("[role controller] Saving new custom role:", role);
    await role.save();
    res.status(201).json({
      message: "[role controller] Custom role created successfully",
      role,
    });
  } catch (error) {
    console.error("[role controller] Error creating custom role:", error);
    res.status(500).json({ message: error.message });
  }
};

const viewCustomRoles = async (req, res) => {
  try {
    console.log(
      "[role controller] Fetching custom roles for user:",
      req.user.id
    );
    const roles = await Role.find({ createdBy: req.user.id, isSystem: false });
    console.log("Fetched roles:", roles);
    res.status(200).json(roles);
  } catch (error) {
    console.error("[role controller] Error viewing custom roles:", error);
    res.status(500).json({ message: error.message });
  }
};

const updateCustomRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { name, permissions } = req.body;
    console.log("[role controller] Update request:", {
      roleId,
      name,
      permissions,
    });

    if (!roleId) {
      console.warn("[role controller] Missing role ID");
      return res.status(400).json({ message: "Role ID is required" });
    }

    const role = await Role.findOne({
      _id: roleId,
      createdBy: req.user.id,
      isSystem: false,
    });

    if (!role) {
      console.warn("[role controller] Custom role not found for update");
      return res.status(404).json({ message: "Custom role not found" });
    }

    if (name) {
      console.log("[role controller] Updating role name:", name);
      role.name = name;
    }

    if (permissions) {
      console.log("[role controller] Updating role permissions:", permissions);
      const defaultPermissions = [
        { entity: "user", action: "view", scope: "own" },
        { entity: "user", action: "update", scope: "own" },
      ];

      const mergedPermissions = [...permissions];

      for (const defaultPerm of defaultPermissions) {
        const exists = mergedPermissions.some(
          (perm) =>
            perm.entity === defaultPerm.entity &&
            perm.action === defaultPerm.action &&
            perm.scope === defaultPerm.scope
        );
        if (!exists) {
          console.log(
            "[role controller] Adding missing default permission:",
            defaultPerm
          );
          mergedPermissions.push(defaultPerm);
        }
      }

      role.permissions = mergedPermissions;
    }

    console.log("[role controller] Saving updated role:", role);
    await role.save();
    res.status(200).json({
      message: "[role controller] Custom role updated successfully",
      role,
    });
  } catch (error) {
    console.error("[role controller] Error updating custom role:", error);
    res.status(500).json({ message: error.message });
  }
};

const deleteCustomRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    console.log("[role controller] Delete role request for ID:", roleId);

    if (!roleId) {
      console.warn("[role controller] Missing role ID");
      return res.status(400).json({ message: "Role ID is required" });
    }

    const role = await Role.findOne({
      _id: roleId,
      createdBy: req.user.id,
      isSystem: false,
    });

    if (!role) {
      console.warn("[role controller] Custom role not found for deletion");
      return res.status(404).json({ message: "Custom role not found" });
    }

    console.log("[role controller] Deleting role:", role);
    await role.deleteOne();
    res
      .status(200)
      .json({ message: "[role controller] Custom role deleted successfully" });
  } catch (error) {
    console.error("[role controller] Error deleting custom role:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  viewCustomRolesByDoctor,
  viewCustomRoles,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
};
