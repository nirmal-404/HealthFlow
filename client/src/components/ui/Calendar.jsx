import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { getAppointmentsByDoctor, getDoctorSchedules } from "../../services/doctorService"
import { useAuthContext } from "../../context/AuthContext"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { useNavigate } from "react-router-dom";
import TokenService from "../../services/TokenService"
const API_URL = `${process.env.REACT_APP_API_URL}/appointments`;


export default function Calendar() {
  const [activeTab, setActiveTab] = useState("Calendar")
  const [activeView, setActiveView] = useState("Day")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [appointments, setAppointments] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [totalAppointments, setTotalAppointments] = useState(0)
  const { currentUser } = useAuthContext()
  const navigate = useNavigate();

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    try {
      const doctorId = currentUser?.id;
      console.log('Doctor ID:', doctorId);
      
      if (!doctorId) {
        console.error('No doctor ID found in currentUser:', currentUser);
        return;
      }

      // Fetch both appointments and schedule
      const [appointmentsResponse, scheduleResponse] = await Promise.all([
        getAppointmentsByDoctor(doctorId),
        getDoctorSchedules(doctorId)
      ]);

      // Filter appointments for selected date
      const filteredAppointments = appointmentsResponse.filter(appointment => {
        if (!appointment.time) return false;
        const appointmentDate = new Date(appointment.time);
        return isSameDay(appointmentDate, selectedDate);
      });

      setAppointments(filteredAppointments.sort((a, b) => new Date(a.time) - new Date(b.time)));
      setTotalAppointments(filteredAppointments.length);

      // Generate time slots from schedule
      if (Array.isArray(scheduleResponse)) {
        const availability = scheduleResponse.reduce((acc, schedule) => {
          return acc.concat(schedule.availability || []);
        }, []);

        const todayAvailability = availability.find(slot => 
          isSameDay(new Date(slot.day), selectedDate)
        );

        if (todayAvailability) {
          const slots = generateTimeSlots(
            new Date(todayAvailability.startTime),
            new Date(todayAvailability.endTime),
            todayAvailability.appointmentDuration
          );
          setTimeSlots(slots);
        } else {
          setTimeSlots([]);
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.message.includes('404')) {
        setAppointments([]);
        setTotalAppointments(0);
        setTimeSlots([]);
      }
    }
  };

  const generateTimeSlots = (startTime, endTime, duration) => {
    const slots = [];
    let currentTime = new Date(startTime);
    
    while (currentTime < endTime) {
      slots.push({
        time: new Date(currentTime),
        endTime: new Date(currentTime.getTime() + duration * 60000)
      });
      currentTime = new Date(currentTime.getTime() + duration * 60000);
    }
    
    return slots;
  };

  const isSameDay = (date1, date2) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const handleDateChange = (increment) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + increment)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-blue-50'
      case 'completed':
        return 'bg-green-50'
      case 'cancelled':
        return 'bg-red-50'
      default:
        return 'bg-gray-50'
    }
  }

  const findAppointmentForSlot = (slotTime) => {
    return appointments.find(appointment => {
      const appointmentTime = new Date(appointment.time);
      return appointmentTime.getTime() === slotTime.getTime();
    });
  };

  const markAppointmentAsComplete = async (appointmentId) => {
    try {
      const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
        body: JSON.stringify({ status: 'completed' })
      });

      if (!response.ok) {
        throw new Error('Failed to update appointment status');
      }

      // Refresh the appointments
      fetchData();
    } catch (error) {
      console.error('Error updating appointment status:', error);
    }
  };

  const unmarkAppointmentAsComplete = async (appointmentId) => {
    try {
      const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
        body: JSON.stringify({ status: 'active' })
      });

      if (!response.ok) {
        throw new Error('Failed to update appointment status');
      }

      // Refresh the appointments
      fetchData();
    } catch (error) {
      console.error('Error updating appointment status:', error);
    }
  };

  return (
    <div className="w-full bg-white flex flex-col h-full">
      {/* Calendar Header - Fixed */}
      <div className="flex-none">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-gray-500" />
              <span className="text-xl font-semibold">{totalAppointments}</span>
            </div>
            <span className="text-sm text-gray-500">total appointments</span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              className="px-3 py-1 text-sm text-blue-600 border border-blue-600 rounded-md"
              onClick={goToToday}
            >
              Today
            </button>
            
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              dateFormat="EEE, MMM d, yyyy"
              className="px-3 py-1 text-sm border border-gray-300 rounded-md cursor-pointer"
              customInput={
                <div className="flex items-center gap-4">
                  <ChevronLeft className="w-5 h-5 text-gray-500 cursor-pointer" onClick={(e) => {
                    e.stopPropagation();
                    handleDateChange(-1);
                  }} />
                  <div className="text-sm font-medium cursor-pointer">
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 cursor-pointer" onClick={(e) => {
                    e.stopPropagation();
                    handleDateChange(1);
                  }} />
                </div>
              }
            />
          </div>

          <div className="flex border rounded-md overflow-hidden">
            <button
              className={`px-3 py-1 text-sm ${activeView === "Day" ? "bg-gray-200" : "bg-white"}`}
              onClick={() => setActiveView("Day")}
            >
              Day
            </button>
            <button
              className={`px-3 py-1 text-sm ${activeView === "Week" ? "bg-gray-200" : "bg-white"}`}
              onClick={() => setActiveView("Week")}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Body - Scrollable */}
      <div className="flex-1 overflow-auto">
        <div className="divide-y">
          {timeSlots.map((slot, index) => {
            const appointment = findAppointmentForSlot(slot.time);

            return (
              <div key={index} className="flex min-h-[100px]">
                <div className="w-24 p-4 text-sm text-gray-500 border-r sticky left-0 bg-white">
                  {formatTime(slot.time)}
                </div>
                <div className="flex-1 p-2">
                  {appointment ? (
                    <div className={`p-3 ${getStatusColor(appointment.status)} rounded-md h-full`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{`${appointment.firstName} ${appointment.lastName}`}</div>
                          <div className="text-sm text-gray-500">
                            {`${formatTime(slot.time)} - ${formatTime(slot.endTime)}`}
                          </div>
                          <div className="mt-1">
                            <span className="px-2 py-0.5 text-xs bg-white border border-gray-300 rounded-full">
                              {appointment.reason}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            Contact: {appointment.phone}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 ${appointment.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'} rounded-full`}></div>
                            <span className="text-xs text-gray-500">{appointment.status}</span>
                          </div>
                          {appointment.status === 'active' && (
                            <>
                              <button 
                                className="px-3 py-1 text-xs text-blue-600 border border-blue-600 rounded-full"
                                onClick={() => navigate(`/account/meeting/${appointment._id}`)}
                              >
                                Join Meeting
                              </button>
                              <button 
                                className="px-3 py-1 text-xs text-green-600 border border-green-600 rounded-full"
                                onClick={() => markAppointmentAsComplete(appointment._id)}
                              >
                                Mark Complete
                              </button>
                              <button 
                                className="px-3 py-1 text-xs text-blue-600 border border-blue-600 rounded-full"
                                onClick={() => navigate(`/account/meeting2/${appointment._id}`)}
                              >
                                Join Meeting test
                              </button>
                            </>
                          )}
                          {appointment.status === 'completed' && (
                            <button 
                              className="px-3 py-1 text-xs text-orange-600 border border-orange-600 rounded-full"
                              onClick={() => unmarkAppointmentAsComplete(appointment._id)}
                            >
                              Unmark Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md border border-gray-100 h-full">
                      <div className="text-sm text-gray-400">Available</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}