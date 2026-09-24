import TokenService from "./TokenService";

const API_URL = `${process.env.REACT_APP_API_URL}/roles`;

const RoleService = {
  // View all custom roles grouped by doctor
  // View all custom roles grouped by doctor
  async getCustomRolesByDoctor() {
    try {
      console.log("[RoleService] Fetching custom roles by doctor");

      const response = await fetch(`${API_URL}/custom/by-doctor`, {
        method: "GET", // Changed from POST to GET
        headers: {
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch custom roles");
      }

      const data = await response.json();
      console.log("[RoleService] Custom roles by doctor fetched:", data);
      return data;
    } catch (error) {
      console.error(
        "[RoleService] Error fetching custom roles by doctor:",
        error
      );
      throw error;
    }
  },

  // ------------------- Custom Role (Doctor) -------------------

  // Create a custom role
  async createCustomRole(roleData) {
    try {
      console.log("[RoleService] Creating custom role with data:", roleData);

      const response = await fetch(`${API_URL}/custom`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
        body: JSON.stringify(roleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create custom role");
      }

      const data = await response.json();
      console.log("[RoleService] Custom role created:", data);
      return data.role || data;
    } catch (error) {
      console.error("[RoleService] Error creating custom role:", error);
      throw error;
    }
  },

  // View all custom roles for the logged-in user
  async getCustomRoles() {
    try {
      console.log("[RoleService] Fetching custom roles");

      const response = await fetch(`${API_URL}/custom`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch custom roles");
      }

      const data = await response.json();
      console.log("[RoleService] Custom roles fetched:", data);
      return data.roles || data;
    } catch (error) {
      console.error("[RoleService] Error fetching custom roles:", error);
      throw error;
    }
  },

  // Update a custom role
  async updateCustomRole(roleId, updatedData) {
    try {
      console.log("[RoleService] Updating custom role:", roleId, updatedData);

      const response = await fetch(`${API_URL}/custom/${roleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update custom role");
      }

      const data = await response.json();
      console.log("[RoleService] Custom role updated:", data);
      return data.role || data;
    } catch (error) {
      console.error("[RoleService] Error updating custom role:", error);
      throw error;
    }
  },

  // Delete a custom role
  async deleteCustomRole(roleId) {
    try {
      console.log("[RoleService] Deleting custom role:", roleId);

      const response = await fetch(`${API_URL}/custom/${roleId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete custom role");
      }

      const data = await response.json();
      console.log("[RoleService] Custom role deleted:", data);
      return data.message || data;
    } catch (error) {
      console.error("[RoleService] Error deleting custom role:", error);
      throw error;
    }
  },
};

export default RoleService;
