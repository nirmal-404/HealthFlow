import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./sidebar";
import TopBar from "./top-bar";

export default function DashboardWrapper() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedSidebarItem, setSelectedSidebarItem] = useState("");

  // Extract the current route to set the active sidebar item
  useEffect(() => {
    const path = location.pathname.split("/")[1];
    if (path) {
      // Capitalize first letter to match sidebar item names
      const formattedPath = path.charAt(0).toUpperCase() + path.slice(1);
      setSelectedSidebarItem(formattedPath);
    }
  }, [location]);

  const handleSelectItem = (item) => {
    setSelectedSidebarItem(item);
    // Convert to lowercase for route
    const route = item.toLowerCase();
    navigate(`/${route}`);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        selectedItem={selectedSidebarItem}
        onSelectItem={handleSelectItem}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Bar */}
        <TopBar />

        {/* Main Content Area - removed p-4 */}
        <main className="flex-1 overflow-y-auto overflow-x-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
