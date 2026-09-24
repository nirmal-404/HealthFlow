const express = require("express");
const router = express.Router();
const {
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
  checkSlotAvailability,
  getDoctorSlotsByDate,
  checkAvailabilityUpdatable,
  updateAvailability, // Add these new controllers
} = require("../controllers/appointmentController");
const { create } = require("../models/Appointment");
const { protect, checkPermission } = require("../middleware/authMiddleware");

//get all doctors
router.get("/doctors", protect, getAllDoctors);

//get doctor by id
router.get("/doctors/:id", protect, getDoctorById);

//create schedule
router.post("/doctors/:id/schedule", protect, createSchedule);

//get doctor schedule
router.get("/doctors/:id/getSchedule", protect, getDoctorSchedule);

//update doctor schedule
router.put("/doctors/:doctorId/schedule", protect, updateSchedule);

//get doctor slots by date
router.get("/doctors/:id/slots", protect, getDoctorSlots); // date will be passed as query parameter

//book appointment
router.post(
  "/doctors/:id/slots/:slotId/appointments",
  protect,
  bookAppointment
); // simplified route for booking

//get appointment by id
router.get("/appointments/:appointmentId", protect, getAppointmentById);

//get all appointments of a doctor
router.get("/appointments/doctor/:doctorId", protect, getAppointmentsByDoctor);

//get all appointments of a patient
router.get(
  "/appointments/patient/:patientId",
  protect,
  getAppointmentsByPatient
);

//delete appointment
router.delete("/appointments/:appointmentId", protect, deleteAppointment);

//get all active appointments
router.get(
  "/appointments/doctor/:doctorId/active",
  protect,
  getActiveAppointments
);

//get appointments by patient name
router.get(
  "/appointments/patient/:firstName/:lastName",
  protect,
  getAppointmentsByPatientName
);

//search doctor by name
router.get("/doctors/search/:searchTerm", protect, searchDoctorByName);

//delete availability
router.delete(
  "/availability/:doctorId/:availabilityId",
  protect,
  deleteAvailability
);

//update appointment status
router.patch("/appointments/:id", protect, updateAppointmentStatus);

//check slot availability
router.get(
  "/doctors/:id/slots/:slotId/availability",
  protect,
  checkSlotAvailability
);

//get doctor slots by availability
router.get("/doctors/:id/slots/:date", protect, getDoctorSlotsByDate);

// New routes for availability update
//check if availability is updatable
router.get(
  "/availability/:doctorId/:availabilityId/check-updatable",
  protect,
  checkAvailabilityUpdatable
);

//update availability
router.put(
  "/availability/:doctorId/:availabilityId",
  protect,
  updateAvailability
);

module.exports = router;
