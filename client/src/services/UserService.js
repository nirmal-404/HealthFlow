// AdminService.js - Handles admin-specific API calls
import TokenService from "./TokenService";

const API_URL = `${process.env.REACT_APP_API_URL}/users`;

const AdminService = {
  // Get all users with statistics
  async getAllUsers() {
    try {
      const response = await fetch(`${API_URL}/`, {
        headers: {
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch users");
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  },

  // Get pending doctor registrations
  async getPendingDoctors() {
    try {
      const response = await fetch(
        `${API_URL}?status=pending&role=sys_doctor`,
        {
          headers: {
            Authorization: `Bearer ${TokenService.getAccessToken()}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch pending doctors");
      }

      const data = await response.json();
      return (
        data.users?.filter(
          (user) =>
            user.primaryRole === "sys_doctor" && user.status === "pending"
        ) || []
      );
    } catch (error) {
      console.error("Error fetching pending doctors:", error);
      throw error;
    }
  },

  // Approve doctor registration
  async approveDoctorRegistration(userId) {
    try {
      const response = await fetch(`${API_URL}/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
        body: JSON.stringify({ status: "active" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || "Failed to approve doctor registration"
        );
      }

      return await response.json();
    } catch (error) {
      console.error(
        `Error approving doctor registration for user ${userId}:`,
        error
      );
      throw error;
    }
  },

  // Reject doctor registration
  async rejectDoctorRegistration(userId) {
    try {
      const response = await fetch(`${API_URL}/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
        body: JSON.stringify({ status: "suspended" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || "Failed to reject doctor registration"
        );
      }

      return await response.json();
    } catch (error) {
      console.error(
        `Error rejecting doctor registration for user ${userId}:`,
        error
      );
      throw error;
    }
  },

  // Get user by ID
  async getUserById(userId) {
    try {
      const response = await fetch(`${API_URL}/${userId}`, {
        headers: {
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch user details");
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      throw error;
    }
  },

  // Update user status
  async updateUserStatus(userId, status) {
    try {
      const response = await fetch(`${API_URL}/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update user status");
      }

      return await response.json();
    } catch (error) {
      console.error(`Error updating user ${userId} status:`, error);
      throw error;
    }
  },

  // Reset user password
  async resetUserPassword(userId, newPassword) {
    try {
      const response = await fetch(`${API_URL}/${userId}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset user password");
      }

      return await response.json();
    } catch (error) {
      console.error(`Error resetting password for user ${userId}:`, error);
      throw error;
    }
  },

  // Toggle user 2FA status
  async toggleUser2FA(userId) {
    try {
      const response = await fetch(`${API_URL}/${userId}/toggle-2fa`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to toggle 2FA status");
      }

      return await response.json();
    } catch (error) {
      console.error(`Error toggling 2FA for user ${userId}:`, error);
      throw error;
    }
  },

  // Get activity report
  async getActivityReport(startDate = null, endDate = null) {
    let url = `${API_URL}/activity-report`;

    // Add date range filters if provided
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch activity report");
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching activity report:", error);
      throw error;
    }
  },

  // Delete user permanently
  async deleteUser(userId) {
    try {
      const response = await fetch(`${API_URL}/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete user");
      }

      return await response.json();
    } catch (error) {
      console.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
  },
};

export default AdminService;
