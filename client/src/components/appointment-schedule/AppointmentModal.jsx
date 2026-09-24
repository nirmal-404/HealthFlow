import { useState, useEffect } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"
import { getDoctorSlotsByDate } from "../../services/doctorService"
import AppointmentDetailsModal from "./AppointmentDetailsModal.jsx"

export default function AppointmentModal({
  isOpen,
  onClose,
  doctorName,
  doctorId,
  specialization,
}) {
  // Initialize with current date, ensuring we start at midnight (00:00:00)
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const [selectedDate, setSelectedDate] = useState(today);
  const [currentDate, setCurrentDate] = useState(today);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSliding, setIsSliding] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [datesWithSlots, setDatesWithSlots] = useState(new Set());

  // Reset state when modal is closed
  const handleClose = () => {
    setSelectedDate(today);
    setCurrentDate(today);
    setAvailableSlots([]);
    setSelectedSlot(null);
    setCurrentStep(1);
    setIsSliding(false);
    setShowDetailsModal(false);
    setDatesWithSlots(new Set());
    onClose();
  };

  // Fetch all slots for the current month
  const fetchMonthSlots = async (date) => {
    try {
      setLoading(true);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const days = eachDayOfInterval({ start, end });
      
      const availableDates = new Set();
      
      // Fetch slots for each day in parallel
      const slotsPromises = days.map(day => getDoctorSlotsByDate(doctorId, day));
      const slotsResults = await Promise.all(slotsPromises);
      
      // Process results to find dates with available slots
      slotsResults.forEach((slots, index) => {
        if (Array.isArray(slots) && slots.some(slot => !slot.isBooked)) {
          availableDates.add(days[index].getTime());
        }
      });
      
      setDatesWithSlots(availableDates);
    } catch (error) {
      console.error('Error fetching month slots:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch slots for a specific date
  const fetchAvailableSlots = async () => {
    try {
      setLoading(true);
      const slots = await getDoctorSlotsByDate(doctorId, selectedDate);
      if (Array.isArray(slots)) {
        const now = new Date();
        const sortedSlots = slots
          .filter(slot => {
            const slotTime = new Date(slot.slotTime);
            // For today's date, filter out passed slots
            if (isSameDay(selectedDate, now)) {
              return !slot.isBooked && slotTime > now;
            }
            // For future dates, just check if slot is not booked
            return !slot.isBooked;
          })
          .sort((a, b) => new Date(a.slotTime).getTime() - new Date(b.slotTime).getTime());
        setAvailableSlots(sortedSlots);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (doctorId) {
      fetchMonthSlots(currentDate);
    }
  }, [doctorId, currentDate]);

  useEffect(() => {
    console.log('Useeffect triggered with:', { doctorId, selectedDate: selectedDate?.toISOString() });
    if (selectedDate && doctorId) {
      // Clear existing slots before fetching new ones
      setAvailableSlots([]);
      setSelectedSlot(null);
      console.log('Fetching slots for:', { doctorId, selectedDate: selectedDate.toISOString() });
      fetchAvailableSlots();
    }
    
    // Cleanup function to reset slots when component unmounts
    return () => {
      setAvailableSlots([]);
      setSelectedSlot(null);
    };
  }, [selectedDate, doctorId]);

  const handleProceed = () => {
    if (!selectedSlot) {
      alert("Please select a time slot");
      return;
    }
    setIsSliding(true);
    setTimeout(() => {
      setShowDetailsModal(true);
    }, 300);
  };

  if (!isOpen) return null;

  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });

    const weeks = [];
    let week = Array(7).fill(null);
    let weekIndex = 0;

    // Fill in empty days at the start
    for (let i = 0; i < days[0].getDay(); i++) {
      week[i] = null;
    }

    days.forEach((day) => {
      week[day.getDay()] = day;
      if (day.getDay() === 6) {
        weeks.push(week);
        week = Array(7).fill(null);
      }
    });

    // Add remaining days
    if (week.some(day => day !== null)) {
      weeks.push(week);
    }

    return weeks;
  }

  const calendarDays = getDaysInMonth();

  const formatTime = (dateString) => {
    return format(new Date(dateString), 'h:mm a');
  };
  return (
    <>
      {/* Global overlay */}      
      <div className="fixed inset-0 bg-black/50 z-30" />      
      <div className="fixed top-[50%] right-[calc(4rem+1px)] -translate-y-1/2 z-40">
        <div className={`bg-white w-[450px] min-h-[850px] shadow-lg rounded-2xl max-h-[90vh] overflow-y-auto transition-transform duration-300 ${isSliding ? 'translate-x-[95%]' : 'translate-x-0'}`}>
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Appointment No:</span>
              <span className="text-sm font-medium">#DOC0010</span>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Doctor Info */}
          <div className="p-4 flex items-center">
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs mr-3">
              Doctor
            </div>
            <div>
              <p className="font-medium">{doctorName}</p>
              <div className="flex items-center text-sm text-gray-500">
                <span>Specialization:</span>
                <span className="ml-1">{specialization}</span>
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div className="px-4 py-2">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">1</div>
              <div className="flex-1 h-1 mx-2 bg-blue-500"></div>
              <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-400">
                2
              </div>
              <div className="flex-1 h-1 mx-2 bg-gray-200"></div>
              <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-400">
                3
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="p-4">
            <div className="border rounded-lg p-4">            <div className="flex justify-between items-center mb-4">
                <button 
                  onClick={() => {
                    const prevMonth = subMonths(currentDate, 1);
                    // Only allow navigating to past months if they're not before the current month
                    if (prevMonth.getMonth() >= new Date().getMonth() || prevMonth.getFullYear() > new Date().getFullYear()) {
                      setCurrentDate(prevMonth);
                    }
                  }}
                  className={`text-gray-400 hover:text-gray-600 ${
                    currentDate.getMonth() === new Date().getMonth() && 
                    currentDate.getFullYear() === new Date().getFullYear() 
                      ? "opacity-50 cursor-not-allowed" 
                      : ""
                  }`}
                  disabled={currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h3 className="font-medium">
                  {format(currentDate, 'MMMM yyyy')}
                </h3>
                <button 
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Days of week */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {days.map((day, index) => (
                  <div key={index} className="text-center text-xs text-gray-500 py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              {calendarDays.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1 mb-1">
                  {week.map((day, dayIndex) => (
                    <div key={dayIndex} className="text-center">
                      {day && (
                        <button
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm relative
                            ${!isSameMonth(day, currentDate) ? "text-gray-300" : 
                              isSameDay(day, selectedDate) ? "bg-indigo-500 text-white" : 
                              day < new Date(new Date().setHours(0, 0, 0, 0)) ? "text-gray-300 cursor-not-allowed" :
                              datesWithSlots.has(day.getTime()) ? "text-gray-700 hover:bg-gray-100 ring-2 ring-indigo-200" :
                              "text-gray-400 hover:bg-gray-50"}`}
                          onClick={() => day >= new Date(new Date().setHours(0, 0, 0, 0)) && datesWithSlots.has(day.getTime()) ? setSelectedDate(day) : null}
                          disabled={!isSameMonth(day, currentDate) || day < new Date(new Date().setHours(0, 0, 0, 0)) || !datesWithSlots.has(day.getTime())}
                        >
                          {format(day, 'd')}
                          {datesWithSlots.has(day.getTime()) && (
                            <span className="absolute bottom-0.5 w-1 h-1 bg-indigo-500 rounded-full"></span>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Time slots */}
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Available Time Slots</h4>
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading available slots...</div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No available slots for this date</div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {availableSlots.map((slot) => (
                  <button
                    key={slot._id}
                    onClick={() => setSelectedSlot(slot)}
                    disabled={slot.isBooked}
                    className={`py-2 px-4 rounded text-sm transition-colors
                      ${slot.isBooked 
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                        : selectedSlot?._id === slot._id
                          ? "bg-indigo-500 text-white"
                          : "border border-indigo-300 text-indigo-500 hover:bg-indigo-50"
                      }`}
                  >
                    {formatTime(slot.slotTime)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add Proceed Button */}
          <div className="p-4 border-t">
            <button
              onClick={handleProceed}
              disabled={!selectedSlot}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
                !selectedSlot 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-indigo-500 hover:bg-indigo-600'
              }`}
            >
              Proceed to Details
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && (
        <AppointmentDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setIsSliding(false);
            handleClose();
          }}
          appointmentData={{
            doctorName,
            specialization,
            selectedDate,
            selectedSlot,
            doctorId
          }}
        />
      )}
    </>
  )
}
