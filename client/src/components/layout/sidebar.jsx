import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import AuthService from "../../services/AuthService";
import Button from "../ui/button";
import {
  Users,
  FileText,
  File,
  Calendar,
  BarChart2,
  DollarSign,
  UserCheck,
  MessageSquare,
  Settings,
  HelpCircle,
  ChevronDown,
  Lock,
  Loader,
  CheckCircle,
  XCircle,
  Activity, // Import Activity icon for the User Activity Dashboard
  UserCog 
} from "lucide-react";


export default function Sidebar() {
  const { logout, permissions, currentUser, activeRole, switchRole } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [userRoles, setUserRoles] = useState([]);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [loading2FA, setLoading2FA] = useState(false);
  const [show2FATooltip, setShow2FATooltip] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => {
    return location.pathname.includes(path);
  };

  const handleRoleSwitch = async (roleId) => {
    // Don't do anything if we're already on this role
    if (roleId === activeRole?.id) {
      setShowRoleMenu(false);
      return;
    }

    try {
      setSwitchingRole(true);
      setShowRoleMenu(false);

      // Call the switchRole function from context
      await switchRole(roleId);
      
      // No need to reload or navigate, just update UI state
      setSwitchingRole(false);
    } catch (error) {
      console.error("Failed to switch role:", error);
      setSwitchingRole(false);
    }
  };

  useEffect(() => {
    // Fetch user roles when the component mounts
    const fetchRoles = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        const data = await response.json();
        setUserRoles(data.user.roles || []);
      } catch (error) {
        console.error("Failed to fetch user roles:", error);
      }
    };

    fetchRoles();
    
    // Fetch 2FA status
    const fetch2FAStatus = async () => {
      try {
        const status = await AuthService.get2FAStatus();
        setIs2FAEnabled(status);
      } catch (error) {
        console.error("Failed to fetch 2FA status:", error);
      }
    };
    
    fetch2FAStatus();
  }, []);

  // Add click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showRoleMenu && !event.target.closest('.role-switcher')) {
        setShowRoleMenu(false);
      }
      
      if (show2FATooltip && !event.target.closest('.twofa-tooltip')) {
        setShow2FATooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRoleMenu, show2FATooltip]);
  
  // Handle 2FA toggle
  const handle2FAToggle = async () => {
    try {
      setLoading2FA(true);
      const result = await AuthService.toggle2FA();
      setIs2FAEnabled(result.otpEnabled);
      
      // Show tooltip with message
      setShow2FATooltip(true);
      
      // Hide tooltip after 3 seconds
      setTimeout(() => {
        setShow2FATooltip(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to toggle 2FA:", error);
    } finally {
      setLoading2FA(false);
    }
  };

  // Log active role for debugging
  useEffect(() => {
    if (activeRole) {
      console.log(`[Sidebar] Active role: ${activeRole.name} (${activeRole.id})`);
    }
  }, [activeRole]);

  // Patient-specific menu items
  const patientMenuItems = [
    {
      category: "HISTORY",
      items: [
        { name: "Patient Documents", 
          icon: <File className="w-4 h-4" />, 
          path: "patient-documents", 
          requiredPerm: "record:view:linked"
        },
        { name: "Patient Prescriptions", 
          icon: <FileText className="w-4 h-4" />, 
          path: "patient-prescription", 
          requiredPerm: "record:view:linked"
        },
        { 
          name: "Past Encounters", 
          icon: <Calendar className="w-4 h-4" />, 
          path: "patient/appointment-history",
          requiredPerm: "record:view:linked"
        },
        { 
          name: "Feedback", 
          icon: <MessageSquare className="w-4 h-4" />, 
          path: "feedback/summary/:id",
          requiredPerm: "feedback:view:own"
        },
      ],
    },
    {
      category: "CONNECT",
      items: [
        { 
          name: "Appointments", 
          icon: <Calendar className="w-4 h-4" />, 
          path: "patient-appointments",
          requiredPerm: "appointment:view:own"
        },
        { 
          name: "Doctors", 
          icon: <BarChart2 className="w-4 h-4" />, 
          path: "search",
          requiredPerm: "appointment:view:own"
        },
        { 
          name: "Chat with Doctor", 
          icon: <MessageSquare className="w-4 h-4" />, 
          path: "patient-chat", 
          requiredPerm: "appointment:create:own" 
        },
      ],
    }
  ];
  
  // Default menu items for all other roles
  const defaultMenuItems = [
    {
      category: "CLINICAL",
      items: [
        { 
          name: "Patients", 
          icon: <Users className="w-4 h-4" />, 
          path: "patients",
          requiredPerm: "record:view:own"
        },
        { 
          name: "Prescriptions", 
          icon: <FileText className="w-4 h-4" />, 
          path: "prescription",
          requiredPerm: "prescription:view:own"
        },
        { 
          name: "Documents", 
          icon: <File className="w-4 h-4" />, 
          path: "documents",
          requiredPerm: "document:view:own"
        },
      ],
    },
    {
      category: "TELEMEDICINE",
      items: [
        { 
          name: "Appointments", 
          icon: <Calendar className="w-4 h-4" />, 
          path: "schedule",
          requiredPerm: "appointment:view:linked"
        },
        { name: "Doctor Chat", icon: <MessageSquare className="w-4 h-4" />, path: "doctor-chat", requiredPerm: "appointment:view:linked" },
        { 
          name: "Finance", 
          icon: <DollarSign className="w-4 h-4" />, 
          path: "finance",
          requiredPerm: "appointment:view:linked"
        },
      ],
    },
    {
      category: "STAFF",
      items: [
        { 
          name: "Staff & Roles", 
          icon: <UserCheck className="w-4 h-4" />, 
          path: "staff-and-roles",
          requiredPerm: "role:view:own"
        },
      ],
    },
    {
      category: "FEEDBACK",
      items: [
        { 
          name: "View Feedback", 
          icon: <FileText className="w-4 h-4" />, 
          path: "feedback/doctor",
          requiredPerm: "feedback:view:own"
        },
      ],
    },
    {
      category: "Users",
      items: [
        { 
          name: "User Activity", 
          icon: <Activity className="w-4 h-4" />, 
          path: "admin/activity-report",
          requiredPerm: "user:view:all"
        },
        { 
          name: "User Management", 
          icon: <UserCog className="w-4 h-4" />, 
          path: "user-management",
          requiredPerm: "user:view:all"
        },
      ],
    },
  ];
  
  // Choose menu items based on active role
  const menuItems = activeRole?.name === "sys_patient" ? patientMenuItems : defaultMenuItems;


  // Default bottom items
  const defaultBottomItems = [
    { 
      name: "My Account", 
      icon: <Settings className="w-4 h-4" />, 
      path: "account-settings",
      requiredPerm: "settings:manage"
    },
  ];
  
  // Patient-specific bottom items
  const patientBottomItems = [
    { 
      name: "Account Settings", 
      icon: <Settings className="w-4 h-4" />, 
      path: "account-settings"
    },
  ];
  
  // Choose bottom items based on active role
  const bottomItems = activeRole?.name === "sys_patient" ? patientBottomItems : defaultBottomItems;

  // Helper function to check permissions
  const hasPermission = (requiredPerm) => {
    if (!requiredPerm) return true;
    
    // Check if any permission matches the required permission
    return permissions.some(perm => {
      // Check if permission object has entity, action, and scope properties
      if (perm.entity && perm.action) {
        const permString = perm.scope && perm.scope !== 'all' 
          ? `${perm.entity}:${perm.action}:${perm.scope}`
          : `${perm.entity}:${perm.action}`;
        
        return requiredPerm === permString || 
               // Also match if the item requires a specific scope but user has 'all' scope
               requiredPerm.startsWith(`${perm.entity}:${perm.action}:`) && perm.scope === 'all';
      }
      
      // If permissions are already in string format
      return perm === requiredPerm;
    });
  };

  // Filter menu items based on user permissions
  const filteredMenuItems = menuItems.map(category => {
    const filteredItems = category.items.filter(item => 
      !item.requiredPerm || hasPermission(item.requiredPerm)
    );
    
    return {
      ...category,
      items: filteredItems
    };
  }).filter(category => category.items.length > 0);

  // Filter bottom items based on user permissions
  const filteredBottomItems = bottomItems.filter(item => 
    !item.requiredPerm || hasPermission(item.requiredPerm)
  );

  return (
    <aside className="w-1/6 bg-white border-r border-gray-200 flex-shrink-0 h-screen overflow-y-auto flex flex-col">
      {/* Logo */}
      <Link to="/" className="flex items-center px-4 py-3 h-[50px] border-b border-gray-200">
        <div className="w-5 h-5 bg-[#2563eb] rounded flex items-center justify-center mr-2">
          <span className="text-white font-bold text-xs">+</span>
        </div>
        <span className="font-bold text-[#2563eb] text-base">HealthFlow</span>
      </Link>

      {/* User Profile and Role Switcher */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-[#ffedd5] rounded-full flex items-center justify-center mr-2">
            <span className="text-[#9a3412] font-medium text-sm">
              {currentUser?.name?.split(" ").map(n => n[0]).join("") || "U"}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{currentUser?.name || "User"}</span>
              <div className="relative role-switcher">
                <button
                  type="button"
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  disabled={switchingRole}
                  className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100 text-sm text-gray-500 hover:text-gray-700"
                >
                  {switchingRole ? (
                    <>
                      <Loader className="w-3 h-3 mr-1 animate-spin" />
                      <span>Switching...</span>
                    </>
                  ) : (
                    <>
                      <span>{activeRole?.name || "No role"}</span>
                      <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
                
                {showRoleMenu && userRoles.length > 0 && !switchingRole && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                    {userRoles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleRoleSwitch(role.id)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                          role.id === activeRole?.id
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-700"
                        }`}
                      >
                        {role.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto">
        {filteredMenuItems.map((category) => (
          <div key={category.category} className="mb-2">
            <div className="px-4 py-1.5">
              <span className="text-sm text-gray-500 font-medium">{category.category}</span>
            </div>
            {category.items.map((item) => (
              <Link
                key={item.name}
                to={`${item.path}`}
                className={`flex items-center w-full px-4 py-2 text-sm ${
                  isActive(item.path)
                    ? "bg-[#eef6ff] text-[#2563eb] font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom Items */}
      <div className="border-t border-gray-200">
        {filteredBottomItems.map((item) => (
          <Link
            key={item.name}
            to={`/${item.path}`}
            className={`flex items-center w-full px-4 py-2.5 text-sm ${
              isActive(item.path)
                ? "bg-[#eef6ff] text-[#2563eb] font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span className="mr-3">{item.icon}</span>
            {item.name}
          </Link>
        ))}

        <div className="flex flex-col space-y-2 pb-4 px-4">
          {/* Two-Factor Authentication Toggle Button */}
          <div className="relative twofa-tooltip">
            <button
              onClick={handle2FAToggle}
              disabled={loading2FA}
              className={`flex items-center justify-between px-4 py-2 text-sm rounded-md w-full
                ${loading2FA ? 'bg-gray-100 text-gray-500' : 
                  is2FAEnabled ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 
                  'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
            >
              <div className="flex items-center">
                <Lock className="w-4 h-4 mr-3" />
                <span>Two-Factor Auth</span>
              </div>
              {loading2FA ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : is2FAEnabled ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
            </button>
            
            {/* Tooltip */}
            {show2FATooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-gray-800 text-white text-xs rounded shadow-lg w-48 text-center">
                Two-factor authentication {is2FAEnabled ? 'enabled' : 'disabled'} successfully
                <div className="absolute w-2 h-2 bg-gray-800 transform rotate-45 left-1/2 -ml-1 bottom-[-4px]"></div>
              </div>
            )}
          </div>
          
          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="px-4 py-2.5"
          >
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
}