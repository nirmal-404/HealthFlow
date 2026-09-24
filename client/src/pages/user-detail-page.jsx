import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Shield, 
  Key, 
  Activity, 
  User, 
  AlertTriangle,
  Check,
  X,
  Trash2
} from "react-feather";
import AdminService from "../services/UserService";

const UserDetailPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  
  const [activeMessage, setActiveMessage] = useState(null);

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await AdminService.getUserById(userId);
      setUser(response.user);
      setSelectedStatus(response.user.status); // Initialize the status dropdown
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch user details");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (newPassword !== confirmPassword) {
      setActiveMessage({ type: "error", text: "Passwords do not match" });
      return;
    }
    
    if (newPassword.length < 6) {
      setActiveMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }
    
    try {
      setLoading(true);
      await AdminService.resetUserPassword(userId, newPassword);
      
      setActiveMessage({ type: "success", text: "Password reset successfully" });
      setShowResetPassword(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setActiveMessage({ type: "error", text: err.message || "Failed to reset password" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    try {
      setLoading(true);
      const response = await AdminService.toggleUser2FA(userId);
      
      // Update user state with new 2FA status
      setUser(prevUser => ({
        ...prevUser,
        otpEnabled: response.user.otpEnabled
      }));
      
      const status = response.user.otpEnabled ? "enabled" : "disabled";
      setActiveMessage({ type: "success", text: `Two-factor authentication ${status} successfully` });
    } catch (err) {
      setActiveMessage({ type: "error", text: err.message || "Failed to toggle 2FA" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await AdminService.updateUserStatus(userId, selectedStatus);
      
      // Update user state with new status
      setUser(prevUser => ({
        ...prevUser,
        status: selectedStatus
      }));
      
      setActiveMessage({ type: "success", text: `User status updated to ${selectedStatus}` });
      setShowStatusChange(false);
    } catch (err) {
      setActiveMessage({ type: "error", text: err.message || "Failed to update user status" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setLoading(true);
      await AdminService.deleteUser(userId);
      
      // Show success message briefly before redirecting
      setActiveMessage({ type: "success", text: `User ${user.name} has been permanently deleted` });
      
      // Redirect back to the user management page after a short delay
      setTimeout(() => {
        navigate('/account/user-management');
      }, 2000);
    } catch (err) {
      setActiveMessage({ type: "error", text: err.message || "Failed to delete user" });
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-600";
      case "inactive":
        return "bg-gray-100 text-gray-600";
      case "suspended":
        return "bg-red-100 text-red-500";
      case "pending":
        return "bg-yellow-100 text-yellow-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (loading && !user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-10">Loading user information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          <h2 className="font-bold">Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/account/user-management')}
            className="mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg flex items-center"
          >
            <ArrowLeft size={16} className="mr-2" /> Back to User Management
          </button>
        </div>
      </div>
    );
  }

  return user ? (
    <div className="container mx-auto p-6 bg-white">
      {/* Back button */}
      <div className="mb-6">
        <button 
          onClick={() => navigate('/account/user-management')}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to User Management
        </button>
      </div>

      {/* User header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(user.status)}`}>
          {user.status}
        </span>
      </div>

      {/* Alert message */}
      {activeMessage && (
        <div className={`p-4 mb-4 rounded-lg flex items-start justify-between ${
          activeMessage.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          <div className="flex items-center">
            {activeMessage.type === "success" ? (
              <Check className="mr-2" size={20} />
            ) : (
              <AlertTriangle className="mr-2" size={20} />
            )}
            <span>{activeMessage.text}</span>
          </div>
          <button 
            onClick={() => setActiveMessage(null)} 
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info Panel */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
          <div className="flex items-center mb-4">
            <User className="text-blue-500 mr-2" size={20} />
            <h2 className="text-lg font-medium">User Information</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="font-medium">{user.name}</p>
            </div>
            
            {user.email && (
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p>{user.email}</p>
              </div>
            )}
            
            {user.mobile && (
              <div>
                <p className="text-sm text-gray-500">Mobile</p>
                <p>{user.mobile}</p>
              </div>
            )}
            
            {user.nic && (
              <div>
                <p className="text-sm text-gray-500">NIC</p>
                <p>{user.nic}</p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-gray-500">User Roles</p>
              <div className="mt-1 space-y-1">
                {user.roles?.map(role => (
                  <div key={role.role._id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                    {role.role.name}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Account Created</p>
              <p>{formatDate(user.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Account Security Panel */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
          <div className="flex items-center mb-4">
            <Shield className="text-blue-500 mr-2" size={20} />
            <h2 className="text-lg font-medium">Account Security</h2>
          </div>
          
          <div className="space-y-4">
            {/* 2FA Status */}
            <div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Two-Factor Authentication</p>
                  <p className={user.otpEnabled ? "text-green-600" : "text-gray-600"}>
                    {user.otpEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <button 
                  onClick={handleToggle2FA} 
                  disabled={loading}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Toggle
                </button>
              </div>
            </div>
            
            {/* Login Information */}
            <div>
              <p className="text-sm text-gray-500">Last Login</p>
              <p>{formatDate(user.lastLoginAt)}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Login Count</p>
              <p>{user.loginCount || 0}</p>
            </div>
            
            {user.failedLoginAttempts > 0 && (
              <div>
                <p className="text-sm text-red-500">Failed Login Attempts</p>
                <p className="text-red-500">{user.failedLoginAttempts}</p>
              </div>
            )}
          </div>
          
          {/* Reset Password Button */}
          <button 
            onClick={() => setShowResetPassword(!showResetPassword)}
            className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
          >
            <Key size={16} className="mr-2" />
            Reset Password
          </button>
          
          {/* Reset Password Form */}
          {showResetPassword && (
            <form onSubmit={handleResetPassword} className="mt-4 p-4 border border-yellow-200 rounded bg-yellow-50">
              <h3 className="font-medium mb-2">Reset User Password</h3>
              
              <div className="mb-3">
                <label className="block text-sm text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={6}
                />
              </div>
              
              <div className="mb-3">
                <label className="block text-sm text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="flex space-x-2 mt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Reset Password
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setShowResetPassword(false);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Account Status Panel */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
          <div className="flex items-center mb-4">
            <Activity className="text-blue-500 mr-2" size={20} />
            <h2 className="text-lg font-medium">Account Status</h2>
          </div>
          
          <div className="space-y-4">
            {/* Current Status */}
            <div>
              <p className="text-sm text-gray-500">Current Status</p>
              <div className="mt-1">
                <span className={`px-3 py-1 inline-block text-sm font-medium rounded-full ${getStatusColor(user.status)}`}>
                  {user.status}
                </span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Status Explanation</p>
              <p className="text-sm mt-1">
                {user.status === "active" && "User has full access to the system."}
                {user.status === "inactive" && "User cannot access the system but account is retained."}
                {user.status === "suspended" && "User account has been temporarily disabled."}
                {user.status === "pending" && "User registration is not yet complete."}
              </p>
            </div>
          </div>
          
          {/* Change Status Button */}
          <button 
            onClick={() => setShowStatusChange(!showStatusChange)}
            className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
          >
            <Activity size={16} className="mr-2" />
            Change Account Status
          </button>
          
          {/* Status Change Form */}
          {showStatusChange && (
            <form onSubmit={handleStatusChange} className="mt-4 p-4 border border-purple-200 rounded bg-purple-50">
              <h3 className="font-medium mb-2">Change Account Status</h3>
              
              <div className="mb-3">
                <label className="block text-sm text-gray-700 mb-1">New Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              
              <div className="flex space-x-2 mt-4">
                <button 
                  type="submit" 
                  disabled={loading || selectedStatus === user.status}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Update Status
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setShowStatusChange(false);
                    setSelectedStatus(user.status); // Reset to current status
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Delete User Section */}
      <div className="mt-8 border-t pt-6">
        <div className="bg-red-50 p-6 rounded-lg border border-red-100">
          <h2 className="text-lg font-medium text-red-700 flex items-center">
            <Trash2 className="mr-2" size={20} />
            Danger Zone
          </h2>
          <p className="mt-2 text-sm text-red-600">
            Permanently delete this user account. This action cannot be undone and will remove all data associated with this user.
          </p>
          
          <button 
            onClick={() => setShowDeleteConfirmation(true)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete User Permanently
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">Confirm User Deletion</h3>
            <p className="mb-6">
              Are you sure you want to <span className="font-semibold text-red-600">permanently delete</span> the user <span className="font-semibold">{user.name}</span>? This action cannot be undone, and all user data will be lost.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : null;
};

export default UserDetailPage;