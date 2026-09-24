import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { format, isBefore, isAfter, subMinutes, addMinutes, parseISO } from 'date-fns';

function TabButton({ label, active, onClick }) {
  return (
    <button
      className={`px-4 py-3 text-sm font-medium border-b-2 ${
        active ? "text-blue-600 border-blue-600" : "text-gray-500 border-transparent hover:text-gray-700"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export default function PatientAppointmentsPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuthContext();
  const [activeTab, setActiveTab] = useState("Upcoming");

  const fetchDoctorDetails = async (appointment) => {
    try {
      console.log(`Fetching details for doctor ID: ${appointment.doctorId}`);
      const doctorResponse = await api.get(`/api/appointments/doctors/${appointment.doctorId}`);
      return {
        ...appointment,
        doctorName: doctorResponse.data.name || 'Unknown Doctor',
        specialization: doctorResponse.data.doctorInfo?.specialization || 'General'
      };
    } catch (err) {
      console.error(`Error fetching doctor details for ${appointment.doctorId}:`, err);
      return {
        ...appointment,
        doctorName: 'Unknown Doctor',
        specialization: 'Unknown'
      };
    }
  };

  const cancelAppointment = async (appointment) => {
    try {
      // Check if appointment was booked within the last 12 hours
      const bookedTime = new Date(appointment.createdAt);
      const now = new Date();
      const hoursSinceBooking = (now - bookedTime) / (1000 * 60 * 60);

      if (hoursSinceBooking > 12) {
        alert("Appointments can only be cancelled within 12 hours of booking");
        return;
      }

      // Confirm cancellation
      if (!window.confirm("Are you sure you want to cancel this appointment?")) {
        return;
      }

      // Call API to cancel appointment with corrected endpoint
      await api.delete(`/api/appointments/appointments/${appointment._id}`);
      
      // Get updated appointments list
      const updatedAppointments = appointments.filter(app => app._id !== appointment._id);
      setAppointments(updatedAppointments);
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      alert('Failed to cancel appointment');
    }
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/appointments/appointments/patient/${currentUser?.id}`);
        
        // Fetch doctor details for each appointment
        const appointmentsWithDoctors = await Promise.all(
          response.data.map(async appointment => {
            const enrichedAppointment = await fetchDoctorDetails(appointment);
            // Ensure appointment has a status
            return {
              ...enrichedAppointment,
              status: enrichedAppointment.status || 'scheduled'
            };
          })
        );
        
        setAppointments(appointmentsWithDoctors);
      } catch (err) {
        setError('Failed to fetch appointments');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?.id) {
      fetchAppointments();
    }
  }, [currentUser?.id]);

  const canJoinMeeting = (appointmentTime) => {
    const now = new Date();
    const appointmentDateTime = parseISO(appointmentTime);
    const thirtyMinutesBefore = subMinutes(appointmentDateTime, 30);
    
    return isAfter(now, thirtyMinutesBefore) && isBefore(now, appointmentDateTime);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  // Filter appointments based on active tab
  const filteredAppointments = appointments.filter(appointment => {
    const now = new Date();
    const appointmentTime = parseISO(appointment.time);
    const fifteenMinutesAfterStart = addMinutes(appointmentTime, 15);

    if (activeTab === "Upcoming") {
      // Show only scheduled/active appointments that haven't passed their 15-minute grace period
      return (appointment.status === "scheduled" || appointment.status === "active") 
             && isBefore(now, fifteenMinutesAfterStart);
    } else if (activeTab === "Past") {
      // Only show appointments that were explicitly completed or cancelled
      // Do NOT show missed appointments (those that passed their 15-min grace period without being completed)
      return appointment.status === "completed" || appointment.status === "cancelled";
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex px-4">
            <TabButton 
              label="Upcoming" 
              active={activeTab === "Upcoming"} 
              onClick={() => setActiveTab("Upcoming")} 
            />
            <TabButton 
              label="Past" 
              active={activeTab === "Past"} 
              onClick={() => setActiveTab("Past")} 
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-4">
          <div className="container mx-auto">
            <div className="grid gap-4">
              {filteredAppointments.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No {activeTab.toLowerCase()} appointments found
                </div>
              ) : (
                filteredAppointments.map((appointment) => (
                  <div
                    key={appointment._id}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="space-y-4">
                      {/* Top section with doctor info and status */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-lg">{appointment.doctorName}</h3>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                              appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{appointment.specialization}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Appointment Time</p>
                          <p className="font-medium">
                            {format(new Date(appointment.time), 'PPp')}
                          </p>
                        </div>
                      </div>

                      {/* Bottom section with reason and action buttons */}
                      <div className="flex justify-between items-end border-t pt-4">
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 mb-1">Reason for Visit</p>
                          <p className="text-gray-700">{appointment.reason}</p>
                        </div>
                        <div className="ml-4 flex gap-2">
                          {appointment.status === 'active' && (
                            <button 
                              className={`inline-flex items-center px-4 py-2 border border-indigo-300 text-sm font-medium rounded-[10px] ${
                                canJoinMeeting(appointment.time)
                                  ? 'text-indigo-600 bg-white hover:bg-indigo-50'
                                  : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                              onClick={() => canJoinMeeting(appointment.time) && navigate(`/account/meeting/${appointment._id}`)}
                              disabled={!canJoinMeeting(appointment.time)}
                              title={!canJoinMeeting(appointment.time) ? "You can join the meeting 30 minutes before the appointment time" : ""}
                            >
                              Join Video Call
                            </button>
                          )}
                          {(appointment.status === 'scheduled' || appointment.status === 'active') && (
                            <button 
                              className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-[10px] text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              onClick={() => cancelAppointment(appointment)}
                            >
                              Cancel Appointment
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
