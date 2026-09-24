import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  ChevronDown, 
  Users, 
  UserCheck, 
  UserPlus,
  UserX, 
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from "react-feather";
import AdminService from "../services/UserService";

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    doctorCount: 0,
    patientCount: 0,
    otherUsers: 0,
    statuses: []
  });
  const [loading, setLoading] = useState(true);
  const [loadingPendingDoctors, setLoadingPendingDoctors] = useState(true);
  const [error, setError] = useState(null);
  const [pendingError, setPendingError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [successMessage, setSuccessMessage] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
    fetchPendingDoctors();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await AdminService.getAllUsers();
      setUsers(response.users);
      setStatistics(response.stats);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingDoctors = async () => {
    try {
      setLoadingPendingDoctors(true);
      const pendingDocs = await AdminService.getPendingDoctors();
      setPendingDoctors(pendingDocs);
      setPendingError(null);
    } catch (err) {
      setPendingError(err.message || "Failed to fetch pending doctor registrations");
    } finally {
      setLoadingPendingDoctors(false);
    }
  };

  const handleViewUser = (userId) => {
    navigate(`user/${userId}`);
  };

  const handleApproveDoctor = async (userId, name) => {
    if (window.confirm(`Are you sure you want to approve ${name}'s doctor registration?`)) {
      try {
        await AdminService.approveDoctorRegistration(userId);
        // Remove the approved doctor from the pending list
        setPendingDoctors(pendingDoctors.filter(doctor => doctor._id !== userId));
        // Show success message
        setSuccessMessage(`${name}'s registration has been approved successfully`);
        // Refresh all users to update statistics
        fetchUsers();
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      } catch (err) {
        setPendingError(err.message || "Failed to approve doctor registration");
      }
    }
  };

  const handleRejectDoctor = async (userId, name) => {
    if (window.confirm(`Are you sure you want to reject ${name}'s doctor registration?`)) {
      try {
        await AdminService.rejectDoctorRegistration(userId);
        // Remove the rejected doctor from the pending list
        setPendingDoctors(pendingDoctors.filter(doctor => doctor._id !== userId));
        // Show success message
        setSuccessMessage(`${name}'s registration has been rejected`);
        // Refresh all users to update statistics
        fetchUsers();
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      } catch (err) {
        setPendingError(err.message || "Failed to reject doctor registration");
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
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

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredUsers = users.filter(user => {
    // Apply search filter
    const matchesSearch = searchTerm === "" || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.mobile && user.mobile.includes(searchTerm));
    
    // Apply status filter
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    
    // Apply role filter
    const matchesRole = roleFilter === "all" || 
      user.roles.some(role => role.name.includes(roleFilter));
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  // Count pending doctor registrations
  const pendingDoctorsCount = pendingDoctors.length;

  return (
    <div className="container mx-auto p-4 bg-white">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-6 flex justify-between items-center">
          <div className="flex items-center">
            <CheckCircle size={20} className="mr-2" />
            {successMessage}
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-700">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Pending Doctor Registrations Section */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Clock className="text-yellow-500 mr-2" size={20} />
          <h2 className="text-lg font-medium">Pending Doctor Approvals ({pendingDoctorsCount})</h2>
        </div>

        {pendingError && (
          <div className="bg-red-100 text-red-500 p-3 rounded-lg mb-4">
            {pendingError}
          </div>
        )}

        {loadingPendingDoctors ? (
          <div className="text-center py-4">Loading pending registrations...</div>
        ) : pendingDoctors.length === 0 ? (
          <div className="bg-gray-50 p-4 rounded-lg text-gray-600 text-center">
            No pending doctor registrations at this time
          </div>
        ) : (
          <div className="bg-yellow-50 rounded-lg overflow-hidden border border-yellow-100">
            <table className="min-w-full divide-y divide-yellow-200">
              <thead className="bg-yellow-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">
                    Specialization
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">
                    License Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">
                    Date Applied
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-yellow-800 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-yellow-200">
                {pendingDoctors.map(doctor => (
                  <tr key={doctor._id} className="hover:bg-yellow-100/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{doctor.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{doctor.email}</div>
                      <div className="text-sm text-gray-500">{doctor.mobile}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doctor.doctorInfo?.specialization || "Not specified"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doctor.doctorInfo?.licenseNumber || "Not provided"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(doctor.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                      <div className="flex justify-center space-x-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();  
                            handleApproveDoctor(doctor._id, doctor.name);
                          }}
                          className="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 flex items-center"
                        >
                          <CheckCircle size={14} className="mr-1" />
                          Approve
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectDoctor(doctor._id, doctor.name);
                          }}
                          className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 flex items-center"
                        >
                          <XCircle size={14} className="mr-1" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="border-t border-gray-200 my-8"></div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="border rounded-lg p-4 bg-blue-50">
          <div className="flex justify-between">
            <div className="text-gray-600 text-sm">Total Users</div>
            <Users size={20} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold mt-2">{statistics.totalUsers}</div>
        </div>
        
        <div className="border rounded-lg p-4 bg-green-50">
          <div className="flex justify-between">
            <div className="text-gray-600 text-sm">Doctors</div>
            <UserCheck size={20} className="text-green-500" />
          </div>
          <div className="text-2xl font-bold mt-2">{statistics.doctorCount}</div>
        </div>
        
        <div className="border rounded-lg p-4 bg-purple-50">
          <div className="flex justify-between">
            <div className="text-gray-600 text-sm">Patients</div>
            <UserPlus size={20} className="text-purple-500" />
          </div>
          <div className="text-2xl font-bold mt-2">{statistics.patientCount}</div>
        </div>
        
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between">
            <div className="text-gray-600 text-sm">Other Users</div>
            <UserX size={20} className="text-gray-500" />
          </div>
          <div className="text-2xl font-bold mt-2">{statistics.otherUsers}</div>
        </div>
      </div>
      
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row justify-between mb-6">
        <div className="relative mb-4 md:mb-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex space-x-3">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-10 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter size={18} className="text-gray-500" />
            </div>
          </div>
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none pl-10 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="sys_admin">Admin</option>
              <option value="sys_doctor">Doctor</option>
              <option value="sys_patient">Patient</option>
            </select>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter size={18} className="text-gray-500" />
            </div>
          </div>
          <button 
            onClick={() => {
              fetchUsers();
              fetchPendingDoctors();
            }}
            className="flex items-center border rounded-lg px-4 py-2 hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCw size={18} className="text-gray-500" />
          </button>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 text-red-500 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Security
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center">
                  Loading users...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center">
                  No users found matching the current filters
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewUser(user._id)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    {user.nic && <div className="text-xs text-gray-500">NIC: {user.nic}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.email && <div className="text-sm text-gray-500">{user.email}</div>}
                    {user.mobile && <div className="text-sm text-gray-500">{user.mobile}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.primaryRole}</div>
                    {user.roles.length > 1 && (
                      <div className="text-xs text-gray-500">+{user.roles.length - 1} more</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.lastLoginAt)}
                    {user.loginCount > 0 && (
                      <div className="text-xs text-gray-400">
                        {user.loginCount} logins
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center">
                      <span className={user.otpEnabled ? "text-green-500" : "text-gray-400"}>2FA {user.otpEnabled ? "Enabled" : "Disabled"}</span>
                    </div>
                    {user.failedLoginAttempts > 0 && (
                      <div className="text-xs text-red-500">
                        {user.failedLoginAttempts} failed attempts
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      className="text-blue-600 hover:text-blue-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewUser(user._id);
                      }}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagementPage;