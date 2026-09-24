import { create } from "zustand";
import RoleService from "../services/RoleService";

const useRoleStore = create((set) => ({
  roles: [],
  loading: false,
  error: null,

  fetchRoles: async () => {
    set({ loading: true, error: null });
    try {
      const roles = await RoleService.getCustomRoles();
      set({ roles, loading: false });
    } catch (error) {
      console.error("Error fetching roles:", error);
      set({ error: error.message || "Failed to fetch roles", loading: false });
    }
  },

  fetchRolesByDoc: async () => {
    set({ loading: true, error: null });
    try {
      const roles = await RoleService.getCustomRolesByDoctor();
      set({ roles, loading: false });
    } catch (error) {
      console.error("Error fetching roles by doctor:", error);
      set({
        error: error.message || "Failed to fetch roles by doctor",
        loading: false,
      });
    }
  },

  createRole: async (roleData) => {
    set({ loading: true, error: null });
    try {
      const response = await RoleService.createCustomRole(roleData);
      // Get the actual role from the response
      const newRole = response.role || response;

      set((state) => ({
        roles: [...state.roles, newRole],
        loading: false,
      }));
      return newRole;
    } catch (error) {
      console.error("Error creating role:", error);
      set({ error: error.message || "Failed to create role", loading: false });
      throw error; // Re-throw to allow handling in component
    }
  },

  updateRole: async (roleId, roleData) => {
    set({ loading: true, error: null });
    try {
      const response = await RoleService.updateCustomRole(roleId, roleData);
      // Get the actual role from the response
      const updatedRole = response.role || response;

      set((state) => ({
        roles: state.roles.map((role) =>
          role._id === roleId ? updatedRole : role
        ),
        loading: false,
      }));
      return updatedRole;
    } catch (error) {
      console.error("Error updating role:", error);
      set({ error: error.message || "Failed to update role", loading: false });
      throw error; // Re-throw to allow handling in component
    }
  },

  deleteRole: async (roleId) => {
    set({ loading: true, error: null });
    try {
      await RoleService.deleteCustomRole(roleId);
      set((state) => ({
        roles: state.roles.filter((role) => role._id !== roleId),
        loading: false,
      }));
    } catch (error) {
      console.error("Error deleting role:", error);
      set({ error: error.message || "Failed to delete role", loading: false });
      throw error; // Re-throw to allow handling in component
    }
  },
}));

export default useRoleStore;
