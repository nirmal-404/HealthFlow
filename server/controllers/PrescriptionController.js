const prescription = require("../models/PrescriptionModel");
const user = require("../models/User");
// const record= require('../models/patient');

//GetAllPrescriptionsByDoctorId
const getAllPrescriptionsByDoctor = async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    const prescriptions = await prescription
      .find({ doctorId: doctorId })
      .populate("patientId", "name email mobile")
      .populate("doctorId", "name email mobile")
      .sort({ dateIssued: -1 }); // Sort by date, newest first

    res.status(200).json(prescriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//GetAllPrescriptionsByPatientId
const getAllPrescriptions = async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.id; // Get the logged-in doctor's ID from the auth middleware

    const prescriptions = await prescription
      .find({
        patientId: patientId,
        doctorId: doctorId,
      })
      .populate("patientId", "name email mobile")
      .populate("doctorId", "name email mobile");

    res.status(200).json(prescriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//GetPrescriptionById
const getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    const roleName = requestingUser?.activeRole?.name;

    const prescriptionDetails = await prescription
      .findById(id)
      .populate("doctorId")
      .populate("patientId");

    if (!prescriptionDetails) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    const requestingUserId = requestingUser.id.toString();
    const isDoctor = prescriptionDetails.doctorId && prescriptionDetails.doctorId._id.toString() === requestingUserId;
    const isPatient = prescriptionDetails.patientId && prescriptionDetails.patientId._id.toString() === requestingUserId;
    const isAdmin = roleName === "sys_admin";

    if (!isDoctor && !isPatient && !isAdmin) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to view this prescription.",
      });
    }

    res.status(200).json(prescriptionDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//CreatePrescription
const CreatePrescription = async (req, res) => {
  try {
    const requestingUser = req.user;
    const roleName = requestingUser?.activeRole?.name;
    const { patientId, doctorId: bodyDoctorId, medicines, validUntil, notes } = req.body;

    // Strict Authorization Check: Only sys_doctor or users with doctor role can create prescriptions
    if (roleName !== "sys_doctor" && roleName !== "sys_admin") {
      return res.status(403).json({
        message: "Forbidden: Only licensed doctors are authorized to create prescriptions.",
      });
    }

    // Automatically enforce logged-in doctor's ID as prescribing doctor
    const doctorId = requestingUser.id.toString();

    console.log("patient id in the backend", patientId);
    console.log("prescribing doctor id in the backend", doctorId);

    const patient = await user.findById(patientId);
    const doctor = await user.findById(doctorId);

    if (!patient || !doctor) {
      return res.status(404).json({ message: "Patient or Doctor record not found" });
    }

    const newPrescription = new prescription({
      patientId,
      doctorId,
      medicines,
      validUntil,
      notes,
    });

    await newPrescription.save();
    res.status(201).json("Prescription Created Successfully");
  } catch (error) {
    console.error("[PrescriptionController] Create error:", error);
    res.status(500).json({ message: error.message });
  }
};

//UpdatePrescription
const UpdatePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    const roleName = requestingUser?.activeRole?.name;

    const existingPrescription = await prescription.findById(id);
    if (!existingPrescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    const isCreatorDoctor = existingPrescription.doctorId.toString() === requestingUser.id.toString();
    const isAdmin = roleName === "sys_admin";

    if (!isCreatorDoctor && !isAdmin) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to update this prescription.",
      });
    }

    const { patientId, medicines, validUntil, notes } = req.body;

    existingPrescription.medicines = medicines || existingPrescription.medicines;
    existingPrescription.validUntil = validUntil || existingPrescription.validUntil;
    existingPrescription.notes = notes !== undefined ? notes : existingPrescription.notes;
    if (patientId) existingPrescription.patientId = patientId;

    await existingPrescription.save();

    res.status(200).json("Prescription Updated Successfully");
  } catch (error) {
    console.error("[PrescriptionController] Update error:", error);
    res.status(500).json({ message: error.message });
  }
};

//DeletePrescription
const DeletePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    const roleName = requestingUser?.activeRole?.name;

    const existingPrescription = await prescription.findById(id);
    if (!existingPrescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    const isCreatorDoctor = existingPrescription.doctorId.toString() === requestingUser.id.toString();
    const isAdmin = roleName === "sys_admin";

    if (!isCreatorDoctor && !isAdmin) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to delete this prescription.",
      });
    }

    await prescription.findByIdAndDelete(id);
    res.status(200).json({ message: "Prescription deleted successfully" });
  } catch (error) {
    console.error("[PrescriptionController] Delete error:", error);
    res.status(500).json({ message: error.message });
  }
};

//SearchPrescription
const SearchPrescription = async (req, res) => {
  try {
    const { query } = req.params;

    // First find users matching the name query
    const matchingPatients = await user
      .find({
        name: { $regex: query, $options: "i" },
      })
      .select("_id");

    const patientIds = matchingPatients.map((p) => p._id);

    // Then find prescriptions for these patients
    const prescriptions = await prescription
      .find({
        patientId: { $in: patientIds },
      })
      .populate("patientId", "name email mobile")
      .populate("doctorId", "name email mobile")
      .sort({ dateIssued: -1 });

    res.status(200).json(prescriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all prescriptions for a patient by patientId (regardless of doctor)
const getAllPrescriptionsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Find all prescriptions for this patient
    const prescriptions = await prescription
      .find({ patientId: patientId })
      .populate("patientId", "name email mobile")
      .populate("doctorId", "name email mobile")
      .sort({ dateIssued: -1 }); // Sort by date, newest first

    res.status(200).json(prescriptions);
  } catch (error) {
    console.error("Error fetching patient prescriptions:", error);
    res.status(500).json({ message: error.message });
  }
};

//Export all the functions
module.exports = {
  getAllPrescriptions,
  getAllPrescriptionsByDoctor,
  getAllPrescriptionsByPatient,
  getPrescriptionById,
  CreatePrescription,
  UpdatePrescription,
  DeletePrescription,
  SearchPrescription,
};
