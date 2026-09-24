import { useNavigate, useLocation } from "react-router-dom"
import { ChevronLeft, Bell, Home, Search, MoreVertical } from "lucide-react"

export default function TopBar() {
  const navigate = useNavigate()
  const location = useLocation()

  // Determine if we're in a patient detail page
  const isPatientDetail = location.pathname.includes("/patients/") && location.pathname.split("/").length > 2

  const handleBack = () => {
    if (isPatientDetail) {
      navigate("/patients")
    } else {
      navigate("/")
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10 h-[50px]">
      <div className="flex items-center justify-between px-4 h-full">
        <div className="flex items-center">
          <button className="flex items-center text-gray-700 hover:text-[#2563eb] mr-4" onClick={handleBack}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span className="font-medium text-sm">Text goes here</span>
          </button>

       
        </div>

        <div className="flex items-center space-x-3">
          <button className="text-gray-500 hover:text-gray-700">
            <Bell className="w-4 h-4" />
          </button>
          <button className="text-gray-500 hover:text-gray-700">
            <Search className="w-4 h-4" />
          </button>
          <button className="text-gray-500 hover:text-gray-700">
            <Home className="w-4 h-4" />
          </button>
          <div className="w-6 h-6 bg-[#ccfbf1] rounded-full flex items-center justify-center text-[#115e59] font-medium text-xs">
            TH
          </div>
          <button className="text-gray-500 hover:text-gray-700">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
