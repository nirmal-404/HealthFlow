import React from "react";
import Card from "../components/ui/card";
import { Calendar, FileText, MessageSquare, User } from "lucide-react";
import { useAuthContext } from "../context/AuthContext";

export default function PatientDashboard() {
  const { currentUser } = useAuthContext();

  const stats = [
    {
      title: "Upcoming Appointments",
      value: "0",
      icon: <Calendar className="h-6 w-6 text-blue-600" />,
      bgColor: "bg-blue-100"
    },
    {
      title: "Prescriptions",
      value: "0",
      icon: <FileText className="h-6 w-6 text-green-600" />,
      bgColor: "bg-green-100"
    },
    {
      title: "Unread Messages",
      value: "0",
      icon: <MessageSquare className="h-6 w-6 text-purple-600" />,
      bgColor: "bg-purple-100"
    },
    {
      title: "My Doctors",
      value: "0",
      icon: <User className="h-6 w-6 text-orange-600" />,
      bgColor: "bg-orange-100"
    }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Welcome, {currentUser?.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center">
              <div className={`${stat.bgColor} p-3 rounded-lg mr-4`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Upcoming Appointments</h2>
          <div className="text-sm text-gray-500">No upcoming appointments</div>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Prescriptions</h2>
          <div className="text-sm text-gray-500">No recent prescriptions</div>
        </Card>
      </div>
    </div>
  );
}
