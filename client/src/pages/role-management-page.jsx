import { useEffect, useState } from "react";
import useRoleStore from "../store/useRoleStore";
import usePreRegistrationStore from "../store/usePreRegistrationStore";
import { useAuthContext } from "../context/AuthContext";
import { useHoverPanel } from "../context/HoverPanelContext";
import Button from "../components/ui/button";
import HoverPanel from "../components/ui/hover-panel";
import RoleForm from "../components/staff-roles/RoleForm";
import PreRegisterForm from "../components/staff-roles/PreRegisterForm";
import { PlusIcon } from "lucide-react";

export default function RoleManagementPage() {
  const { roles, fetchRolesByDoc, createRole, updateRole, deleteRole, error: roleError } = useRoleStore();
  const { permissions: activeRolePermissions } = useAuthContext();
  const { openPanel } = useHoverPanel();
  
  const {
    preRegistered,
    fetchPreRegistered,
    addPreRegistered,
    removePreRegistered,
    loading: preregLoading,
    error: preregError,
    clearError,
  } = usePreRegistrationStore();

  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("success"); // "success" or "error"

  // Fetch roles and pre-registrations on component mount
  useEffect(() => {
    fetchRolesByDoc();
    fetchPreRegistered();
  }, [fetchRolesByDoc, fetchPreRegistered]);

  // Handle role-related errors
  useEffect(() => {
    if (roleError) {
      showStatus(roleError, "error");
    }
  }, [roleError]);

  // Handle pre-registration errors
  useEffect(() => {
    if (preregError) {
      showStatus(preregError, "error");
      clearError();
    }
  }, [preregError, clearError]);

  // Helper to display status messages
  const showStatus = (message, type = "success") => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => setStatusMessage(""), 5000);
  };

  const isRestrictedPermission = (perm) =>
    perm.entity === "user" &&
    ["view", "update", "delete"].includes(perm.action) &&
    perm.scope === "own";

  // Role management handlers
  const handleCreate = () => {
    openPanel("Create Role", (
      <RoleForm
        onSubmit={async (newRole) => {
          try {
            await createRole(newRole);
            showStatus("Role created successfully");
          } catch (err) {
            showStatus(`Failed to create role: ${err.message}`, "error");
          }
        }}
        permissions={activeRolePermissions}
        isRestrictedPermission={isRestrictedPermission}
      />
    ));
  };

  const handleEdit = (role) => {
    openPanel("Edit Role", (
      <RoleForm
        role={role}
        onSubmit={async (updatedRole) => {
          try {
            await updateRole(role._id, updatedRole);
            showStatus("Role updated successfully");
          } catch (err) {
            showStatus(`Failed to update role: ${err.message}`, "error");
          }
        }}
        permissions={activeRolePermissions}
        isRestrictedPermission={isRestrictedPermission}
      />
    ));
  };

  const handleDelete = async (roleId) => {
    if (window.confirm("Are you sure you want to delete this role?")) {
      try {
        await deleteRole(roleId);
        showStatus("Role deleted successfully");
      } catch (err) {
        showStatus(`Failed to delete role: ${err.message}`, "error");
      }
    }
  };

  const handleRemovePreRegistered = async (id) => {
    if (window.confirm("Are you sure you want to remove this role assignment?")) {
      try {
        await removePreRegistered(id);
        showStatus("Role assignment removed successfully");
      } catch (err) {
        showStatus(`Failed to remove role assignment: ${err.message}`, "error");
      }
    }
  };

  const handlePreRegister = async (email, roleId) => {
    try {
      const selectedRole = roles.find(r => r._id === roleId);
      await addPreRegistered(email, roleId);
      showStatus(`Role '${selectedRole?.name || "selected"}' assigned to ${email} successfully`);
    } catch (err) {
      // Error is already set in the store
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="max-w-6xl flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
          <Button 
            onClick={handleCreate}
            className="shadow-sm"
            icon={<PlusIcon className="w-5 h-5" />}
          >
            Create New Role
          </Button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className={`p-4 rounded-lg shadow-sm ${
            statusType === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}>
            {statusMessage}
          </div>
        )}

        {/* Roles Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden max-w-6xl">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Custom Roles</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {roles && roles.length > 0 ? (
                  roles.map((role) => (
                    <tr key={role._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{role.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {role.permissions.map((perm, index) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {`${perm.entity}:${perm.action}:${perm.scope}`}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleEdit(role)}
                            variant="ghost"
                            size="sm"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDelete(role._id)}
                            variant="danger"
                            size="sm"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500 italic">
                      No roles found. Create a role to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Role Assignment Section Header */}
        <div className="pt-4">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">  Assign Staff To Roles</h2>
          
          <div className="grid grid-cols-12 gap-6">
            {/* Assign Role Form - 3 columns */}
            <div className="col-span-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Assign Role</h3>
              </div>
              <div className="p-6">
                <PreRegisterForm
                  roles={roles}
                  onSubmit={handlePreRegister}
                  isLoading={preregLoading}
                />
              </div>
            </div>

            {/* Role Assignments Table - 9 columns */}
            <div className="col-span-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Staff - Role Assignments</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Assigned</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {preRegistered && preRegistered.length > 0 ? (
                      preRegistered.map((entry) => (
                        <tr key={entry._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {entry.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.role?.name || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              entry.isRegistered 
                                ? "bg-green-100 text-green-800" 
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {entry.isRegistered ? "Registered" : "Pending"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Button
                              onClick={() => handleRemovePreRegistered(entry._id)}
                              variant="danger"
                              size="sm"
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 italic">
                          No role assignments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <HoverPanel />
    </div>
  );
}