const Role = require("../models/Role");

async function getRolesAndActiveRole(user) {
  if (!user.roles || user.roles.length === 0) {
    return { populatedRoles: [], activeRole: null };
  }

  const populatedRoles = await Promise.all(
    user.roles.map(async (roleRef) => {
      const role = await Role.findById(roleRef.role).select(
        "_id name permissions"
      );
      return role ? { ...roleRef, role } : null;
    })
  ).then((r) => r.filter(Boolean));

  let activeRole =
    populatedRoles.find(
      (r) => r.role._id.toString() === user.lastActiveRole?.toString()
    ) || populatedRoles[0];

  return { populatedRoles, activeRole };
}

module.exports = { getRolesAndActiveRole };
