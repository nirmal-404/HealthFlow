const DoctorSchedule = require("../models/DoctorSchedule");
const Appointment = require("../models/Appointment");
const mongoose = require("mongoose");
const User = require("../models/User");
const querystring = require("querystring");
const dotenv = require("dotenv");
const { RtcTokenBuilder, RtcRole } = require("agora-token");
const { sendAppointmentConfirmation } = require("../utils/emailService");
const Role = require("../models/Role"); // Added missing Role model import

require("dotenv").config();

//search doctor by name or specialization
const searchDoctorByName = async (req, res) => {
  try {
    const { searchTerm } = req.params;
    // Get the doctor role ID first
    const doctorRole = await mongoose
      .model("Role")
      .findOne({ name: "sys_doctor" });
    if (!doctorRole) {
      return res
        .status(404)
        .json({ message: "Doctor role not found in the system" });
    }

    // Search for doctors by name or specialization using case-insensitive search
    const doctors = await User.find({
      "roles.role": doctorRole._id,
      $or: [
        { name: { $regex: searchTerm, $options: "i" } },
        { "doctorInfo.specialization": { $regex: searchTerm, $options: "i" } },
      ],
    })
      .select("name email mobile doctorInfo")
      .populate("roles.role", "name");

    if (!doctors || doctors.length === 0) {
      return res
        .status(404)
        .json({ message: "No doctors found matching your search." });
    }

    res.status(200).json(doctors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error searching for doctors.", error });
  }
};

//create schedule
const createSchedule = async (req, res) => {
  try {
    const { availability, consultationFee } = req.body;
    const doctorId = req.params.id;

    // Create slots from availability
    const slots = [];
    availability.forEach((day) => {
      const startTime = new Date(day.startTime);
      const endTime = new Date(day.endTime);
      const duration = day.appointmentDuration;

      let slotTime = new Date(startTime);
      while (slotTime < endTime) {
        slots.push({
          day: day.day,
          slotTime: slotTime.toISOString(),
          isBooked: false,
        });
        slotTime = new Date(slotTime.getTime() + duration * 60000); // Increment by duration
      }
    });

    // Save schedule and slots
    const schedule = new DoctorSchedule({
      doctorId,
      availability,
      slots,
      consultationFee,
    });
    await schedule.save();

    res.status(201).json(schedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating schedule", error });
  }
};

//get doctor slots
const getDoctorSlots = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const { date } = req.query;
    console.log("Controller: Received request for slots:", { doctorId, date });

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);
    console.log("Controller: Formatted query date:", queryDate);

    const schedules = await DoctorSchedule.find({ doctorId }).lean();
    console.log("Controller: Found schedules count:", schedules.length);

    if (!schedules.length) {
      console.log("Controller: No schedules found for doctor");
      return res
        .status(404)
        .json({ message: "No schedule found for this doctor" });
    }

    // Combine slots from all schedules and filter by date
    const allSlots = schedules.reduce((acc, schedule) => {
      console.log(
        "Controller: Processing schedule with slots count:",
        schedule.slots.length
      );
      const slotsForDay = schedule.slots.filter((slot) => {
        const slotTime = new Date(slot.slotTime);
        return (
          slotTime.getFullYear() === queryDate.getFullYear() &&
          slotTime.getMonth() === queryDate.getMonth() &&
          slotTime.getDate() === queryDate.getDate()
        );
      });
      console.log(
        "Controller: Found matching slots for date:",
        slotsForDay.length
      );
      return acc.concat(slotsForDay);
    }, []);

    // Sort slots by time
    allSlots.sort((a, b) => new Date(a.slotTime) - new Date(b.slotTime));
    console.log("Controller: Final slots count:", allSlots.length);

    res.json(allSlots);
  } catch (error) {
    console.error("Controller: Error in getDoctorSlots:", error);
    res.status(500).json({ message: "Error fetching slots", error });
  }
};

//book appointment
const bookAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      patientId,
      slotId,
      reason,
      title,
      firstName,
      lastName,
      phone,
      nic,
      email,
      status,
    } = req.body;

    // Log the received data
    console.log("Received appointment data:", {
      doctorId,
      patientId,
      slotId,
      reason,
      title,
      firstName,
      lastName,
      phone,
      nic,
      email,
      status,
    });

    // Fetch the doctor's schedule
    const schedules = await DoctorSchedule.find({ doctorId });
    if (!schedules.length)
      return res.status(404).json({ message: "Doctor schedule not found" });

    let slot;
    let schedule;

    // Find the specific slot
    for (const sched of schedules) {
      slot = sched.slots.id(slotId);
      if (slot) {
        schedule = sched;
        break;
      }
    }

    // Check if the slot is available
    if (!slot || slot.isBooked) {
      return res.status(400).json({ message: "Slot is not available" });
    }

    // Get doctor's name for the email
    const doctor = await User.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Generate Agora token
    const APP_ID = process.env.APP_ID;
    const APP_CERTIFICATE = process.env.APP_CERTIFICATE;

    const channelName = `appointment-${slotId}`;
    const uid = 0;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600 * 24 * 30;

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const agoraToken = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );

    // Create the appointment with the slot time
    const appointment = new Appointment({
      doctorId,
      patientId,
      slotId,
      time: new Date(slot.slotTime),
      reason,
      title,
      firstName,
      lastName,
      phone,
      nic,
      email,
      status,
      channelName,
      agoraToken,
    });

    await appointment.save();

    // Mark slot as booked
    slot.isBooked = true;
    await schedule.save();

    // Send confirmation email
    try {
      await sendAppointmentConfirmation({
        email,
        firstName,
        lastName,
        time: slot.slotTime,
        doctorName: doctor.name,
        reason,
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Don't return here, we still want to return the appointment data even if email fails
    }

    res.status(201).json(appointment);
  } catch (error) {
    console.error("Error in bookAppointment:", error);
    res
      .status(500)
      .json({ message: "Error booking appointment", error: error.message });
  }
};

//get doctor by id

const getDoctorById = async (req, res) => {
  try {
    const doctorId = req.params.id;

    // Get the doctor role ID first
    const doctorRole = await mongoose
      .model("Role")
      .findOne({ name: "sys_doctor" });
    if (!doctorRole) {
      return res
        .status(404)
        .json({ message: "Doctor role not found in the system" });
    }

    // Find the doctor with the specified ID and role
    const doctor = await User.findOne({
      _id: doctorId,
      "roles.role": doctorRole._id,
    })
      .select("name email mobile doctorInfo") // Select only needed fields
      .populate("roles.role", "name"); // Populate role information

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    res.status(200).json(doctor);
  } catch (error) {
    console.error("Error fetching doctor:", error);
    res
      .status(500)
      .json({ message: "Error fetching doctor.", error: error.message });
  }
};

//get doctor schedule

const getDoctorSchedule = async (req, res) => {
  try {
    const doctorId = req.params.id;
    // Use lean() for better performance and add options to prevent caching
    const schedule = await DoctorSchedule.find({ doctorId })
      .lean()
      .select("-__v")
      .maxTimeMS(30000)
      .exec();

    if (!schedule || schedule.length === 0) {
      return res.status(404).json({ message: "Schedule not found." });
    }

    res.status(200).json(schedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching schedule.", error });
  }
};

//update doctor schedule

const updateSchedule = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { day, startTime, endTime, appointmentDuration } = req.body;

    // Find all schedules for the doctor
    const schedules = await DoctorSchedule.find({ doctorId });
    if (!schedules.length) {
      return res.status(404).json({ message: "Doctor schedule not found" });
    }

    // Convert `day` to a Date object for comparison
    const dayDate = new Date(day);

    // Find which schedule contains the availability for this day
    let targetSchedule = null;
    let availability = null;

    for (const schedule of schedules) {
      availability = schedule.availability.find(
        (a) => new Date(a.day).toISOString() === dayDate.toISOString()
      );
      if (availability) {
        targetSchedule = schedule;
        break;
      }
    }

    if (!targetSchedule || !availability) {
      return res.status(404).json({ message: "Day not found in availability" });
    }

    // Update the start time and end time
    availability.startTime = new Date(startTime);
    availability.endTime = new Date(endTime);

    // Recreate slots for the updated day
    const newSlots = [];
    let slotTime = new Date(startTime);
    const endTimeDate = new Date(endTime);

    while (slotTime < endTimeDate) {
      newSlots.push({
        day: dayDate.toISOString(),
        slotTime: slotTime.toISOString(),
        isBooked: false,
      });
      slotTime = new Date(slotTime.getTime() + appointmentDuration * 60000);
    }

    // Replace the slots for the updated day
    targetSchedule.slots = targetSchedule.slots
      .filter(
        (slot) => new Date(slot.day).toISOString() !== dayDate.toISOString()
      )
      .concat(newSlots);

    // Save the updated schedule
    await targetSchedule.save();

    res.status(200).json({
      message: "Schedule updated successfully",
      schedule: targetSchedule,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating schedule", error });
  }
};

//get appointment by id

const getAppointmentById = async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId; // Changed from req.params.id to req.params.appointmentId
    console.log("Received appointment ID:", appointmentId);
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    res.status(200).json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching appointment.", error });
  }
};

//get all appointments of a doctor
const getAppointmentsByDoctor = async (req, res) => {
  try {
    const doctorId = req.params.doctorId;

    // Get all appointments for the doctor
    const appointments = await Appointment.find({ doctorId });

    if (!appointments.length) {
      return res
        .status(404)
        .json({ message: "No appointments found for this doctor." });
    }

    // Get all schedules for the doctor
    const schedules = await DoctorSchedule.find({ doctorId });

    // Map over appointments and add slot time information
    const appointmentsWithSlotTime = await Promise.all(
      appointments.map(async (apt) => {
        const aptObj = apt.toObject();

        // Find the schedule containing this slot
        for (const schedule of schedules) {
          const slot = schedule.slots.id(apt.slotId);
          if (slot) {
            aptObj.time = slot.slotTime;
            break;
          }
        }

        return aptObj;
      })
    );

    res.status(200).json(appointmentsWithSlotTime);
  } catch (error) {
    console.error("Error in getAppointmentsByDoctor:", error);
    res
      .status(500)
      .json({ message: "Error fetching appointments.", error: error.message });
  }
};

//get active appointments of a doctor sorted in ascending order of slotTime
const getActiveAppointments = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const appointments = await Appointment.find({
      doctorId,
      status: "active",
    }).sort({ slotTime: 1 });

    if (!appointments.length) {
      return res.status(404).json({ message: "No active appointments found" });
    }

    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving appointments", error });
  }
};

//get all appointments of a patient

const getAppointmentsByPatient = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const appointments = await Appointment.find({ patientId });

    if (!appointments.length) {
      return res
        .status(404)
        .json({ message: "No appointments found for this patient." });
    }

    res.status(200).json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching appointments.", error });
  }
};

//delete appointment

const deleteAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId;

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    // Check if appointment was booked within last 12 hours
    const bookedTime = new Date(appointment.createdAt);
    const now = new Date();
    const hoursSinceBooking = (now - bookedTime) / (1000 * 60 * 60);

    if (hoursSinceBooking > 12) {
      return res.status(400).json({
        message:
          "Appointments can only be cancelled within 12 hours of booking",
      });
    }

    // Find the schedule and slot
    const schedules = await DoctorSchedule.find({
      doctorId: appointment.doctorId,
    });
    if (!schedules.length) {
      return res.status(404).json({ message: "Doctor schedule not found" });
    }

    let slot;
    let schedule;

    // Find the specific slot in the doctor's schedule
    for (const sched of schedules) {
      slot = sched.slots.id(appointment.slotId);
      if (slot) {
        schedule = sched;
        break;
      }
    }

    if (!slot) {
      return res
        .status(404)
        .json({ message: "Slot not found in doctor schedule." });
    }

    // Release the slot by marking it as not booked
    slot.isBooked = false;
    await schedule.save();

    // Delete the appointment
    await Appointment.findByIdAndDelete(appointmentId);

    res.status(200).json({ message: "Appointment cancelled successfully." });
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    res
      .status(500)
      .json({ message: "Error cancelling appointment", error: error.message });
  }
};

//get appointments by patient name
const getAppointmentsByPatientName = async (req, res) => {
  try {
    const { firstName, lastName } = req.params;
    const appointments = await Appointment.find({ firstName, lastName });

    if (!appointments.length) {
      return res
        .status(404)
        .json({ message: "No appointments found for this patient." });
    }

    res.status(200).json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching appointments.", error });
  }
};

//delete availability period and associated slots
const deleteAvailability = async (req, res) => {
  try {
    const { doctorId, availabilityId } = req.params;

    // Find all schedules for the doctor
    const schedules = await DoctorSchedule.find({ doctorId });
    if (!schedules.length) {
      return res.status(404).json({ message: "Doctor schedule not found" });
    }

    // Find which schedule contains the availability
    let targetSchedule = null;
    let availability = null;

    for (const schedule of schedules) {
      availability = schedule.availability.id(availabilityId);
      if (availability) {
        targetSchedule = schedule;
        break;
      }
    }

    if (!targetSchedule || !availability) {
      return res.status(404).json({ message: "Availability period not found" });
    }

    // Get the start and end times of the availability period
    const startTime = new Date(availability.startTime);
    const endTime = new Date(availability.endTime);
    const availabilityDay = new Date(availability.day);

    // Check if any slots in this availability period are already booked
    const slotsInPeriod = targetSchedule.slots.filter((slot) => {
      const slotTime = new Date(slot.slotTime);
      const slotDay = new Date(slot.day);

      return (
        slotDay.getTime() === availabilityDay.getTime() &&
        slotTime >= startTime &&
        slotTime <= endTime
      );
    });

    // If any slot is booked, prevent deletion
    const anySlotBooked = slotsInPeriod.some((slot) => slot.isBooked);
    if (anySlotBooked) {
      return res.status(400).json({
        message:
          "Cannot delete availability period because it contains booked appointments",
      });
    }

    // Remove slots that fall within this availability period
    targetSchedule.slots = targetSchedule.slots.filter((slot) => {
      const slotTime = new Date(slot.slotTime);
      const slotDay = new Date(slot.day);

      // Check if the slot is on the same day and within the time range
      return !(
        slotDay.getTime() === availabilityDay.getTime() &&
        slotTime >= startTime &&
        slotTime <= endTime
      );
    });

    // Remove the availability period
    targetSchedule.availability.pull(availabilityId);

    // Save the updated schedule
    await targetSchedule.save();

    res.status(200).json({
      message: "Availability period and associated slots deleted successfully",
      schedule: targetSchedule,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error deleting availability period", error });
  }
};

//update appointment status
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    res.status(200).json(appointment);
  } catch (error) {
    console.error("Error in updateAppointmentStatus:", error);
    res.status(500).json({
      message: "Error updating appointment status.",
      error: error.message,
    });
  }
};

const getDoctorSlotsByDate = async (req, res) => {
  try {
    const { id: doctorId } = req.params;
    const { date } = req.query;
    const queryDate = new Date(date);

    // Ensure we get fresh data from MongoDB
    const schedules = await DoctorSchedule.find({ doctorId })
      .lean()
      .maxTimeMS(30000);

    if (!schedules.length) {
      return res
        .status(404)
        .json({ message: "No schedule found for this doctor" });
    }

    // Filter slots for the specific date
    const slotsForDate = schedules.reduce((acc, schedule) => {
      const matchingSlots = schedule.slots.filter((slot) => {
        const slotTime = new Date(slot.slotTime);
        // Compare year, month, and day only
        return (
          slotTime.getFullYear() === queryDate.getFullYear() &&
          slotTime.getMonth() === queryDate.getMonth() &&
          slotTime.getDate() === queryDate.getDate()
        );
      });
      return [...acc, ...matchingSlots];
    }, []);

    // Sort slots by time
    slotsForDate.sort((a, b) => new Date(a.slotTime) - new Date(b.slotTime));

    res.json(slotsForDate);
  } catch (error) {
    console.error("Error in getDoctorSlotsByDate:", error);
    res
      .status(500)
      .json({ message: "Error fetching slots", error: error.message });
  }
};

//check slot availability
const checkSlotAvailability = async (req, res) => {
  try {
    const { id: doctorId, slotId } = req.params;

    // Find the doctor's schedule that contains this slot
    const schedules = await DoctorSchedule.find({ doctorId });
    if (!schedules.length) {
      return res
        .status(404)
        .json({ message: "No schedule found for this doctor" });
    }

    // Find the specific slot
    let slot = null;
    for (const schedule of schedules) {
      const foundSlot = schedule.slots.id(slotId);
      if (foundSlot) {
        slot = foundSlot;
        break;
      }
    }

    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    res.json({ isAvailable: !slot.isBooked });
  } catch (error) {
    console.error("Error in checkSlotAvailability:", error);
    res.status(500).json({
      message: "Error checking slot availability",
      error: error.message,
    });
  }
};

// Check if an availability is updatable (no booked slots)
const checkAvailabilityUpdatable = async (req, res) => {
  try {
    const { doctorId, availabilityId } = req.params;

    // Find all schedules for the doctor
    const schedules = await DoctorSchedule.find({ doctorId });
    if (!schedules.length) {
      return res.status(404).json({ message: "Doctor schedule not found" });
    }

    // Find which schedule contains the availability
    let targetSchedule = null;
    let availability = null;

    for (const schedule of schedules) {
      availability = schedule.availability.id(availabilityId);
      if (availability) {
        targetSchedule = schedule;
        break;
      }
    }

    if (!targetSchedule || !availability) {
      return res.status(404).json({ message: "Availability period not found" });
    }

    // Get the start and end times of the availability period
    const startTime = new Date(availability.startTime);
    const endTime = new Date(availability.endTime);
    const availabilityDay = new Date(availability.day);

    // Check if any slots in this availability period are already booked
    const slotsInPeriod = targetSchedule.slots.filter((slot) => {
      const slotTime = new Date(slot.slotTime);
      const slotDay = new Date(slot.day);

      return (
        slotDay.getTime() === availabilityDay.getTime() &&
        slotTime >= startTime &&
        slotTime <= endTime
      );
    });

    // If any slot is booked, prevent update
    const anySlotBooked = slotsInPeriod.some((slot) => slot.isBooked);

    res.json({
      updatable: !anySlotBooked,
      message: anySlotBooked
        ? "Cannot update this availability because it contains booked appointments"
        : "Availability can be updated",
    });
  } catch (error) {
    console.error("Error in checkAvailabilityUpdatable:", error);
    res.status(500).json({
      message: "Error checking availability updateable status",
      error: error.message,
    });
  }
};

// Update availability and recreate slots
const updateAvailability = async (req, res) => {
  try {
    const { doctorId, availabilityId } = req.params;
    const { availability, consultationFee } = req.body;

    if (!availability || !availability.length) {
      return res.status(400).json({ message: "No availability data provided" });
    }

    const availabilityData = availability[0]; // We only update one availability at a time

    // Find all schedules for the doctor
    const schedules = await DoctorSchedule.find({ doctorId });
    if (!schedules.length) {
      return res.status(404).json({ message: "Doctor schedule not found" });
    }

    // Find which schedule contains the availability
    let targetSchedule = null;
    let oldAvailability = null;

    for (const schedule of schedules) {
      oldAvailability = schedule.availability.id(availabilityId);
      if (oldAvailability) {
        targetSchedule = schedule;
        break;
      }
    }

    if (!targetSchedule || !oldAvailability) {
      return res.status(404).json({ message: "Availability period not found" });
    }

    // Get the old start and end times
    const oldStartTime = new Date(oldAvailability.startTime);
    const oldEndTime = new Date(oldAvailability.endTime);
    const oldDay = new Date(oldAvailability.day);
    oldDay.setHours(0, 0, 0, 0);

    // Verify that no booked slots exist in this availability
    const oldSlotsInPeriod = targetSchedule.slots.filter((slot) => {
      const slotTime = new Date(slot.slotTime);
      const slotDay = new Date(slot.day);
      slotDay.setHours(0, 0, 0, 0);

      return (
        slotDay.getTime() === oldDay.getTime() &&
        slotTime >= oldStartTime &&
        slotTime <= oldEndTime
      );
    });

    if (oldSlotsInPeriod.some((slot) => slot.isBooked)) {
      return res.status(400).json({
        message:
          "Cannot update this availability because it contains booked appointments",
      });
    }

    // Remove old slots from this availability period
    targetSchedule.slots = targetSchedule.slots.filter((slot) => {
      const slotTime = new Date(slot.slotTime);
      const slotDay = new Date(slot.day);
      slotDay.setHours(0, 0, 0, 0);

      return !(
        slotDay.getTime() === oldDay.getTime() &&
        slotTime >= oldStartTime &&
        slotTime <= oldEndTime
      );
    });

    // Update the availability details
    oldAvailability.day = new Date(availabilityData.day);
    oldAvailability.startTime = new Date(availabilityData.startTime);
    oldAvailability.endTime = new Date(availabilityData.endTime);
    oldAvailability.appointmentDuration = availabilityData.appointmentDuration;

    // Update consultation fee if provided
    if (consultationFee) {
      targetSchedule.consultationFee = Number(consultationFee);
    }

    // Create new slots based on the updated availability
    const day = oldAvailability;
    const startTime = new Date(day.startTime);
    const endTime = new Date(day.endTime);
    const duration = day.appointmentDuration;
    const dayDate = new Date(day.day);
    dayDate.setHours(0, 0, 0, 0);

    let slotTime = new Date(startTime);
    while (slotTime < endTime) {
      targetSchedule.slots.push({
        day: dayDate,
        slotTime: new Date(slotTime),
        isBooked: false,
      });
      slotTime = new Date(slotTime.getTime() + duration * 60000); // Increment by duration
    }

    // Save the updated schedule
    await targetSchedule.save();

    res.status(200).json({
      message: "Availability updated successfully",
      schedule: targetSchedule,
    });
  } catch (error) {
    console.error("Error in updateAvailability:", error);
    res
      .status(500)
      .json({ message: "Error updating availability", error: error.message });
  }
};

// Get all users with the 'doctor' role
const getAllDoctors = async (req, res) => {
  console.log("[AuthController] getAllDoctors called");
  try {
    // Find the Role ID for 'doctor'
    console.log("[AuthController] Finding doctor role");
    const doctorRole = await Role.findOne({ name: "sys_doctor" }); // Changed from 'doctor' to 'sys_doctor'
    if (!doctorRole) {
      console.log("[AuthController] Doctor role not found");
      return res
        .status(404)
        .json({ message: "Doctor role definition not found" });
    }
    console.log("[AuthController] Found doctor role:", doctorRole._id);

    // Find users who have the doctor role - using same query as the appointmentController
    console.log("[AuthController] Finding users with doctor role");
    const doctors = await User.find({
      "roles.role": doctorRole._id,
    })
      .select("name email mobile doctorInfo") // Select only needed fields
      .populate("roles.role", "name")
      .lean();

    console.log(`[AuthController] Found ${doctors.length} doctors:`, doctors);

    if (!doctors || doctors.length === 0) {
      return res
        .status(404)
        .json({ message: "No doctors found in the system" });
    }

    res.status(200).json(doctors);
  } catch (error) {
    console.error("[AuthController] Error fetching doctors:", error);
    res
      .status(500)
      .json({ message: "Internal error", errorDetails: error.message });
  }
};

module.exports = {
  getAllDoctors,
  createSchedule,
  getDoctorSlots,
  bookAppointment,
  getDoctorById,
  getDoctorSchedule,
  updateSchedule,
  getAppointmentById,
  getAppointmentsByDoctor,
  getAppointmentsByPatient,
  deleteAppointment,
  getActiveAppointments,
  getAppointmentsByPatientName,
  searchDoctorByName,
  deleteAvailability,
  updateAppointmentStatus,
  getDoctorSlotsByDate,
  checkSlotAvailability,
  checkAvailabilityUpdatable,
  updateAvailability,
};
