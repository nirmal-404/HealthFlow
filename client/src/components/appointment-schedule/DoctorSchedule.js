"use client";

import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./DatePicker.css"; // Import our custom styles after the default styles
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Bell,
  HelpCircle,
  Settings,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import {
  getDoctorSchedules,
  deleteAvailability,
  createSchedule,
  checkAvailabilityUpdatable,
  updateAvailability,
} from "../../services/doctorService";
import { useAuthContext } from "../../context/AuthContext";
import Calendar from "../ui/Calendar";

export default function HealthFlowDashboard() {
  // At the top of the component, initialize date with hours set to 0
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const { currentUser, activeRole, permissions } = useAuthContext();
  const [activeTab, setActiveTab] = useState("Schedule");
  const [availabilityCount, setAvailabilityCount] = useState(0);
  const [availabilities, setAvailabilities] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [filteredAvailabilities, setFilteredAvailabilities] = useState([]);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showUpdatePanel, setShowUpdatePanel] = useState(false);
  const [currentAvailability, setCurrentAvailability] = useState(null);
  const [consultationFee, setConsultationFee] = useState("");
  const [availability, setAvailability] = useState([
    {
      day: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      appointmentDuration: 30,
    },
  ]);
  const [errors, setErrors] = useState({});
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  // Add a function to handle showing alerts
  const showAlert = (message, type = "error") => {
    setAlertMessage({ message, type });
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setAlertMessage(null);
    }, 5000);
  };

  const handleAvailabilityChange = (index, field, value) => {
    const newAvailability = [...availability];
    const newErrors = { ...errors };

    if (field === "day") {
      // When day changes, update the date part of startTime and endTime
      const currentStartTime = new Date(newAvailability[index].startTime);
      const currentEndTime = new Date(newAvailability[index].endTime);

      const newStartTime = new Date(value);
      newStartTime.setHours(
        currentStartTime.getHours(),
        currentStartTime.getMinutes(),
        0,
        0
      );

      const newEndTime = new Date(value);
      newEndTime.setHours(
        currentEndTime.getHours(),
        currentEndTime.getMinutes(),
        0,
        0
      );

      newAvailability[index] = {
        ...newAvailability[index],
        day: value,
        startTime: newStartTime,
        endTime: newEndTime,
      };
    } else if (field === "startTime" || field === "endTime") {
      // When times change, preserve the date from the day field
      const selectedDate = new Date(newAvailability[index].day);
      const newTime = new Date(value);

      const combinedDateTime = new Date(selectedDate);
      combinedDateTime.setHours(newTime.getHours(), newTime.getMinutes(), 0, 0);

      newAvailability[index][field] = combinedDateTime;

      // Check if we have both start and end times to validate
      const startTime =
        field === "startTime"
          ? combinedDateTime
          : newAvailability[index].startTime;
      const endTime =
        field === "endTime"
          ? combinedDateTime
          : newAvailability[index].endTime;

      if (startTime && endTime) {
        // Clear any existing error first
        delete newErrors[`availability_time_${index}`];

        if (startTime >= endTime) {
          newErrors[`availability_time_${index}`] = "End time must be after start time";
        }
      }
    } else {
      newAvailability[index][field] = value;
    }

    setAvailability(newAvailability);
    setErrors(newErrors); // Update errors state
  };

  const handleAddAvailability = () => {
    setAvailability([
      ...availability,
      {
        day: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        appointmentDuration: 30,
      },
    ]);
  };

  const handleRemoveSlot = (index) => {
    // Don't remove if it's the only slot
    if (availability.length <= 1) {
      return;
    }
    const newAvailability = availability.filter((_, i) => i !== index);
    setAvailability(newAvailability);
  };

  const checkForOverlap = (
    newAvailability,
    existingAvailabilities,
    excludeAvailabilityId = null
  ) => {
    for (const slot of newAvailability) {
      const slotDay = new Date(slot.day);
      slotDay.setHours(0, 0, 0, 0);
      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);

      // Check against all existing availabilities
      for (const existing of existingAvailabilities) {
        // Skip if this is the availability being updated
        if (excludeAvailabilityId && existing._id === excludeAvailabilityId) {
          continue;
        }

        const existingDay = new Date(existing.day);
        existingDay.setHours(0, 0, 0, 0);

        // Only check availabilities on the same day
        if (slotDay.getTime() === existingDay.getTime()) {
          const existingStart = new Date(existing.startTime);
          const existingEnd = new Date(existing.endTime);

          // Check for overlap
          if (
            (slotStart >= existingStart && slotStart < existingEnd) || // New slot starts during existing slot
            (slotEnd > existingStart && slotEnd <= existingEnd) || // New slot ends during existing slot
            (slotStart <= existingStart && slotEnd >= existingEnd) // New slot completely contains existing slot
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validate consultation fee
    if (!consultationFee || consultationFee <= 0) {
      newErrors.consultationFee = "Please enter a valid consultation fee";
    }

    // Validate each availability slot
    availability.forEach((slot, index) => {
      if (!slot.day) {
        newErrors[`availability_day_${index}`] = "Please select a day";
      }

      if (!slot.startTime) {
        newErrors[`availability_startTime_${index}`] =
          "Please select a start time";
      }

      if (!slot.endTime) {
        newErrors[`availability_endTime_${index}`] =
          "Please select an end time";
      }

      if (slot.startTime && slot.endTime && slot.startTime >= slot.endTime) {
        newErrors[`availability_time_${index}`] =
          "End time must be after start time";
      }

      if (!slot.appointmentDuration || slot.appointmentDuration <= 0) {
        newErrors[`availability_duration_${index}`] =
          "Please enter a valid duration";
      }
    });

    // Check for overlapping slots
    if (checkForOverlap(availability, availabilities)) {
      newErrors.overlap =
        "New availability overlaps with existing availability slots";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const doctorId = currentUser?.id;
      await createSchedule(doctorId, {
        availability,
        consultationFee: Number(consultationFee),
      });

      // Refresh the availabilities list
      const data = await getDoctorSchedules(doctorId);
      if (Array.isArray(data)) {
        const allAvailabilities = data.reduce((acc, schedule) => {
          return acc.concat(schedule.availability || []);
        }, []);
        setAvailabilities(allAvailabilities);
        setAvailabilityCount(allAvailabilities.length);
        filterAvailabilities(allAvailabilities, selectedDate);
      }

      setShowAddPanel(false);
      setErrors({});

      // Reset form
      setConsultationFee("");
      setAvailability([
        {
          day: new Date(),
          startTime: new Date(),
          endTime: new Date(),
          appointmentDuration: 30,
        },
      ]);
    } catch (error) {
      console.error("Error creating schedule:", error);
      setErrors({ submit: "Failed to create schedule. Please try again." });
    }
  };

  const handleUpdate = async (availabilityItem) => {
    try {
      const doctorId = currentUser?.id;
      // Check if availability can be updated (no booked slots)
      const result = await checkAvailabilityUpdatable(
        doctorId,
        availabilityItem._id
      );

      if (result.updatable) {
        // Find the schedule containing this availability for consultation fee
        const schedules = await getDoctorSchedules(doctorId);
        let scheduleFee = "";
        if (Array.isArray(schedules)) {
          // Find the schedule that contains this availability
          for (const schedule of schedules) {
            const found = schedule.availability.some(
              (a) => a._id === availabilityItem._id
            );
            if (found) {
              scheduleFee = schedule.consultationFee.toString();
              break;
            }
          }
        }

        // Set up the form for editing
        setConsultationFee(scheduleFee);

        // Create a deep copy of the availability to edit
        const availabilityToEdit = {
          day: new Date(availabilityItem.day),
          startTime: new Date(availabilityItem.startTime),
          endTime: new Date(availabilityItem.endTime),
          appointmentDuration: availabilityItem.appointmentDuration,
        };

        // Set the current availability for the form
        setAvailability([availabilityToEdit]);

        // Store the current availability ID for the update operation
        setCurrentAvailability(availabilityItem);

        // Show the update panel
        setShowUpdatePanel(true);
      } else {
        showAlert(
          "Cannot update this availability because it contains booked appointments",
          "error"
        );
      }
    } catch (error) {
      console.error("Error checking if availability can be updated:", error);
      showAlert("Failed to check availability status", "error");
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validate consultation fee
    if (!consultationFee || consultationFee <= 0) {
      newErrors.consultationFee = "Please enter a valid consultation fee";
    }

    // Validate each availability slot
    availability.forEach((slot, index) => {
      if (!slot.day) {
        newErrors[`availability_day_${index}`] = "Please select a day";
      }

      if (!slot.startTime) {
        newErrors[`availability_startTime_${index}`] =
          "Please select a start time";
      }

      if (!slot.endTime) {
        newErrors[`availability_endTime_${index}`] =
          "Please select an end time";
      }

      if (slot.startTime && slot.endTime && slot.startTime >= slot.endTime) {
        newErrors[`availability_time_${index}`] =
          "End time must be after start time";
      }

      if (!slot.appointmentDuration || slot.appointmentDuration <= 0) {
        newErrors[`availability_duration_${index}`] =
          "Please enter a valid duration";
      }
    });

    // Check for overlapping slots, excluding the current availability being updated
    if (
      checkForOverlap(availability, availabilities, currentAvailability._id)
    ) {
      newErrors.overlap =
        "Updated availability overlaps with existing availability slots";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const doctorId = currentUser?.id;
      await updateAvailability(doctorId, currentAvailability._id, {
        availability,
        consultationFee: Number(consultationFee),
      });

      // Refresh the availabilities list
      const data = await getDoctorSchedules(doctorId);
      if (Array.isArray(data)) {
        const allAvailabilities = data.reduce((acc, schedule) => {
          return acc.concat(schedule.availability || []);
        }, []);
        setAvailabilities(allAvailabilities);
        setAvailabilityCount(allAvailabilities.length);
        filterAvailabilities(allAvailabilities, selectedDate);
      }

      setShowUpdatePanel(false);
      setErrors({});

      // Reset form
      setConsultationFee("");
      setAvailability([
        {
          day: new Date(),
          startTime: new Date(),
          endTime: new Date(),
          appointmentDuration: 30,
        },
      ]);
    } catch (error) {
      console.error("Error updating schedule:", error);
      setErrors({ submit: "Failed to update schedule. Please try again." });
    }
  };

  const filterAvailabilities = (availabilities, date) => {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 14);

    const filtered = availabilities
      .filter((avail) => {
        const availDate = new Date(avail.day);
        return availDate >= startDate && availDate <= endDate;
      })
      .sort((a, b) => new Date(a.day) - new Date(b.day))
      .slice(0, 14); // Limit to 14 entries

    setFilteredAvailabilities(filtered);
    setAvailabilityCount(filtered.length); // Update count to show only filtered availabilities
  };

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const doctorId = currentUser?.id;
        console.log("Doctor ID:", doctorId);
        if (!doctorId) return; // Don't fetch if no doctor ID

        console.log("Fetching schedules for date:", selectedDate);
        const data = await getDoctorSchedules(doctorId);

        if (Array.isArray(data)) {
          // Flatten all availabilities from all schedules into a single array
          const allAvailabilities = data.reduce((acc, schedule) => {
            return acc.concat(schedule.availability || []);
          }, []);

          console.log("All availabilities:", allAvailabilities);
          setAvailabilities(allAvailabilities);

          // Immediately filter availabilities for the current date
          const startDate = new Date(selectedDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(selectedDate);
          endDate.setDate(endDate.getDate() + 14);

          const filtered = allAvailabilities
            .filter((avail) => {
              const availDate = new Date(avail.day);
              availDate.setHours(0, 0, 0, 0);
              return availDate >= startDate && availDate <= endDate;
            })
            .sort((a, b) => new Date(a.day) - new Date(b.day))
            .slice(0, 14);

          console.log("Filtered availabilities:", filtered);
          setFilteredAvailabilities(filtered);
          setAvailabilityCount(filtered.length);
        }
      } catch (error) {
        console.error("Error fetching schedules:", error);
        setAvailabilityCount(0);
        setFilteredAvailabilities([]);
      }
    };

    fetchSchedules();
  }, [selectedDate, currentUser?.id]); // Add currentUser?.id to dependencies

  const handleDateChange = (e) => {
    const selectedValue = e.target.value;
    const newDate = new Date(selectedValue);
    const currentDate = new Date();

    // Ensure the selected date is not in the past
    if (newDate < new Date(currentDate.setHours(0, 0, 0, 0))) {
      return; // Don't update if date is in the past
    }

    setSelectedDate(newDate);
    filterAvailabilities(availabilities, newDate);
  };

  const handleDelete = async (availabilityId) => {
    try {
      const doctorId = currentUser?.id;
      await deleteAvailability(doctorId, availabilityId);

      // Refresh the availabilities after deletion
      const data = await getDoctorSchedules(doctorId);
      if (Array.isArray(data)) {
        const allAvailabilities = data.reduce((acc, schedule) => {
          return acc.concat(schedule.availability || []);
        }, []);
        setAvailabilities(allAvailabilities);
        setAvailabilityCount(allAvailabilities.length);
        filterAvailabilities(allAvailabilities, selectedDate);
      }

      // Show success message
      showAlert("Availability deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting availability:", error);

      // Get error message from response if available
      let errorMessage = "Failed to delete availability";

      // Check all possible locations where the error message might be
      if (error.response) {
        if (
          typeof error.response.data === "object" &&
          error.response.data.message
        ) {
          if (
            error.response.data.message.includes("contains booked appointments")
          ) {
            errorMessage =
              "This availability cannot be deleted because it contains slots that are already booked by patients.";
          } else {
            errorMessage = error.response.data.message;
          }
        } else if (typeof error.response.data === "string") {
          errorMessage = error.response.data;
          if (errorMessage.includes("contains booked appointments")) {
            errorMessage =
              "This availability cannot be deleted because it contains slots that are already booked by patients.";
          }
        }
      }

      // Use the custom alert instead of browser alert
      showAlert(errorMessage, "error");
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "Calendar") {
      setShowCalendarView(true);
    } else {
      setShowCalendarView(false);
    }
  };

  // Format date for input value
  const formatDateForInput = (date) => {
    return date.toISOString().split("T")[0];
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const getTodayFormatted = () => {
    return new Date().toISOString().split("T")[0];
  };

  // Format time for display
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Alert Message */}
      {alertMessage && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-md shadow-md flex items-center z-50 ${
            alertMessage.type === "error"
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-green-50 text-green-800 border border-green-200"
          }`}
        >
          {alertMessage.type === "error" ? (
            <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
          ) : (
            <svg
              className="h-5 w-5 mr-2 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          <span className="text-sm font-medium">{alertMessage.message}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex px-4">
            <TabButton
              label="Calendar"
              active={activeTab === "Calendar"}
              onClick={() => handleTabChange("Calendar")}
            />
            <TabButton
              label="Schedule"
              active={activeTab === "Schedule"}
              onClick={() => handleTabChange("Schedule")}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {showCalendarView ? (
            <div className="h-full">
              <Calendar />
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4">
              {/* Total Availabilities */}
              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  <div className="h-6 w-6 bg-gray-200 rounded flex items-center justify-center mr-2">
                    <CalendarIcon />
                  </div>
                  <span className="text-xl font-semibold mr-2">
                    {availabilityCount}
                  </span>
                  <span className="text-gray-500 text-sm">
                    total availabilities
                  </span>
                </div>

                {/* Date Selection */}
                <div className="ml-auto flex items-center">
                  <input
                    type="date"
                    value={formatDateForInput(selectedDate)}
                    onChange={handleDateChange}
                    min={getTodayFormatted()}
                    className="px-3 py-2 border border-gray-300 rounded-md mr-4 text-sm"
                  />
                  <button
                    className="ml-4 bg-green-100 text-green-600 px-4 py-1.5 rounded-md text-sm font-medium"
                    onClick={() => setShowAddPanel(true)}
                  >
                    Add Availability
                  </button>
                </div>
              </div>

              {/* Availability Grid */}
              <div className="grid grid-cols-2 gap-4">
                {filteredAvailabilities.map((availability, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="mb-2">
                      <p className="text-sm font-medium">
                        {new Date(availability.day).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatTime(availability.startTime)} -{" "}
                        {formatTime(availability.endTime)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {availability.appointmentDuration} min appointments
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUpdate(availability)}
                        className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => handleDelete(availability._id)}
                        className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Panel */}
      {showAddPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex justify-end items-center">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl flex flex-col mr-6 my-auto max-h-[90vh] overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center">
                <div className="bg-gray-100 p-2 rounded-lg mr-3">
                  <CalendarIcon />
                </div>
                <div>
                  <h2 className="font-medium">Add Availability</h2>
                  <p className="text-sm text-gray-500">
                    Create a new availability slot
                  </p>
                </div>
              </div>
              <button
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
                onClick={() => setShowAddPanel(false)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-5 h-5 text-gray-500"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <form
                id="availabilityForm"
                onSubmit={handleSubmit}
                className="space-y-8"
              >
                <div className="bg-white rounded-lg">
                  {/* Financial Information Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Financial Information
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700">
                        Consultation Fee (USD)
                      </label>
                      <div className="mt-2">
                        <input
                          type="number"
                          value={consultationFee}
                          onChange={(e) => setConsultationFee(e.target.value)}
                          className="p-2.5 border border-gray-300 rounded-lg w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          required
                        />
                      </div>
                      {errors.consultationFee && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.consultationFee}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Availability Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Availability Settings
                    </h3>
                    {availability.map((slot, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 p-6 border border-gray-200 rounded-lg relative"
                      >
                        <div className="mb-6">
                          <h4 className="text-md font-medium text-gray-900">
                            Time Slot {index + 1}
                          </h4>
                          {availability.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSlot(index)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors duration-200"
                              title="Remove Slot"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="grid gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select Date
                            </label>
                            <DatePicker
                              selected={slot.day}
                              onChange={(date) =>
                                handleAvailabilityChange(index, "day", date)
                              }
                              dateFormat="MMMM d, yyyy"
                              minDate={today}
                              className="p-2.5 border border-gray-300 rounded-lg w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              calendarClassName="custom-datepicker"
                              required
                            />
                            {errors[`availability_day_${index}`] && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors[`availability_day_${index}`]}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Time
                              </label>
                              <DatePicker
                                selected={slot.startTime}
                                onChange={(date) =>
                                  handleAvailabilityChange(
                                    index,
                                    "startTime",
                                    date
                                  )
                                }
                                showTimeSelect
                                showTimeSelectOnly
                                timeIntervals={15}
                                timeCaption="Start"
                                dateFormat="h:mm aa"
                                className="p-2.5 border border-gray-300 rounded-lg w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                calendarClassName="custom-datepicker"
                                required
                              />
                              {errors[`availability_startTime_${index}`] && (
                                <p className="text-red-500 text-sm mt-1">
                                  {errors[`availability_startTime_${index}`]}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Time
                              </label>
                              <DatePicker
                                selected={slot.endTime}
                                onChange={(date) =>
                                  handleAvailabilityChange(
                                    index,
                                    "endTime",
                                    date
                                  )
                                }
                                showTimeSelect
                                showTimeSelectOnly
                                timeIntervals={15}
                                timeCaption="End"
                                dateFormat="h:mm aa"
                                className="p-2.5 border border-gray-300 rounded-lg w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                calendarClassName="custom-datepicker"
                                required
                              />
                              {errors[`availability_endTime_${index}`] && (
                                <p className="text-red-500 text-sm mt-1">
                                  {errors[`availability_endTime_${index}`]}
                                </p>
                              )}
                            </div>
                          </div>

                          {errors[`availability_time_${index}`] && (
                            <p className="text-red-500 text-sm">
                              {errors[`availability_time_${index}`]}
                            </p>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Appointment Duration
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder="Duration"
                                value={slot.appointmentDuration}
                                onChange={(e) =>
                                  handleAvailabilityChange(
                                    index,
                                    "appointmentDuration",
                                    e.target.value
                                  )
                                }
                                className="p-2.5 border border-gray-300 rounded-lg w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none pr-16"
                                required
                              />
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                minutes
                              </span>
                            </div>
                            {errors[`availability_duration_${index}`] && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors[`availability_duration_${index}`]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {errors.availability && (
                      <p className="text-red-500 text-sm">
                        {errors.availability}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleAddAvailability}
                      className="w-full py-3 px-4 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-200 font-medium flex items-center justify-center space-x-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      <span>Add Another Time Slot</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Panel Footer */}
            <div className="p-4 border-t mt-auto">
              <div className="flex space-x-3">
                <button
                  type="submit"
                  form="availabilityForm"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                >
                  Save Availability
                </button>
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  onClick={() => setShowAddPanel(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Panel */}
      {showUpdatePanel && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex justify-end items-center">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl flex flex-col mr-6 my-auto min-h-[90vh] overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center">
                <div className="bg-gray-100 p-2 rounded-lg mr-3">
                  <CalendarIcon />
                </div>
                <div>
                  <h2 className="font-medium">Update Availability</h2>
                  <p className="text-sm text-gray-500">
                    Edit availability details
                  </p>
                </div>
              </div>
              <button
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
                onClick={() => setShowUpdatePanel(false)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-5 h-5 text-gray-500"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <form
                id="updateAvailabilityForm"
                onSubmit={handleUpdateSubmit}
                className="space-y-8"
              >
                <div className="bg-white rounded-lg">
                  {/* Financial Information Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Financial Information
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700">
                        Consultation Fee (USD)
                      </label>
                      <div className="mt-2">
                        <input
                          type="number"
                          value={consultationFee}
                          onChange={(e) => setConsultationFee(e.target.value)}
                          className="p-2.5 border border-gray-300 rounded-lg w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          required
                        />
                      </div>
                      {errors.consultationFee && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.consultationFee}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Availability Section */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Availability Settings
                    </h3>
                    {availability.map((slot, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 p-6 border border-gray-200 rounded-lg relative"
                      >
                        <div className="grid gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select Date
                            </label>
                            <DatePicker
                              selected={slot.day}
                              onChange={(date) =>
                                handleAvailabilityChange(index, "day", date)
                              }
                              dateFormat="MMMM d, yyyy"
                              minDate={today}
                              className="p-2.5 border border-gray-300 rounded-lg w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              calendarClassName="custom-datepicker"
                              required
                            />
                            {errors[`availability_day_${index}`] && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors[`availability_day_${index}`]}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Time
                              </label>
                              <DatePicker
                                selected={slot.startTime}
                                onChange={(date) =>
                                  handleAvailabilityChange(
                                    index,
                                    "startTime",
                                    date
                                  )
                                }
                                showTimeSelect
                                showTimeSelectOnly
                                timeIntervals={15}
                                timeCaption="Start"
                                dateFormat="h:mm aa"
                                className="p-2.5 border border-gray-300 rounded-lg w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                calendarClassName="custom-datepicker"
                                required
                              />
                              {errors[`availability_startTime_${index}`] && (
                                <p className="text-red-500 text-sm mt-1">
                                  {errors[`availability_startTime_${index}`]}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Time
                              </label>
                              <DatePicker
                                selected={slot.endTime}
                                onChange={(date) =>
                                  handleAvailabilityChange(
                                    index,
                                    "endTime",
                                    date
                                  )
                                }
                                showTimeSelect
                                showTimeSelectOnly
                                timeIntervals={15}
                                timeCaption="End"
                                dateFormat="h:mm aa"
                                className="p-2.5 border border-gray-300 rounded-lg w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                calendarClassName="custom-datepicker"
                                required
                              />
                              {errors[`availability_endTime_${index}`] && (
                                <p className="text-red-500 text-sm mt-1">
                                  {errors[`availability_endTime_${index}`]}
                                </p>
                              )}
                            </div>
                          </div>

                          {errors[`availability_time_${index}`] && (
                            <p className="text-red-500 text-sm">
                              {errors[`availability_time_${index}`]}
                            </p>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Appointment Duration
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder="Duration"
                                value={slot.appointmentDuration}
                                onChange={(e) =>
                                  handleAvailabilityChange(
                                    index,
                                    "appointmentDuration",
                                    e.target.value
                                  )
                                }
                                className="p-2.5 border border-gray-300 rounded-lg w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none pr-16"
                                required
                              />
                              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                                minutes
                              </span>
                            </div>
                            {errors[`availability_duration_${index}`] && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors[`availability_duration_${index}`]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {errors.availability && (
                      <p className="text-red-500 text-sm">
                        {errors.availability}
                      </p>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Panel Footer */}
            <div className="p-4 border-t mt-auto">
              <div className="flex space-x-3">
                <button
                  type="submit"
                  form="updateAvailabilityForm"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                >
                  Update Availability
                </button>
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  onClick={() => setShowUpdatePanel(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      className={`px-4 py-3 text-sm font-medium border-b-2 ${
        active
          ? "text-blue-600 border-blue-600"
          : "text-gray-500 border-transparent hover:text-gray-700"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function NavItem({ icon, label, active = false }) {
  return (
    <div
      className={`flex items-center px-4 py-2 text-sm ${
        active ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <div className="w-5 h-5 mr-3 flex-shrink-0">{icon}</div>
      <span>{label}</span>
    </div>
  );
}

function AvailabilitySlot() {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="mb-2">
        <p className="text-sm font-medium">Fri, 16 May 2024</p>
        <p className="text-sm text-gray-500">09:00 AM - 12:00 PM</p>
      </div>
      <div className="flex space-x-2">
        <button className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100">
          Update
        </button>
        <button className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100">
          Delete
        </button>
      </div>
    </div>
  );
}

// Custom Icons

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-gray-500">
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 2V6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 2V6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
