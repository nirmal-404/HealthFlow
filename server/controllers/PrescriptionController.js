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
    const prescriptionDetails = await prescription
      .findById(id)
      .populate("doctorId");
    if (!prescriptionDetails) {
      return res.status(404).json({ message: "Prescription not found" });
    }
    res.status(200).json(prescriptionDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//CreatePrescription
const CreatePrescription = async (req, res) => {
  try {
    const { patientId, doctorId, medicines, validUntil, notes } = req.body;

    console.log("patient id in the backend", patientId);
    console.log("doctor id in the backend", doctorId);
    const patient = await user.findById(patientId);
    const doctor = await user.findById(doctorId);
    console.log(doctor);
    if (!patientId || !doctorId) {
      return res.status(404).json({ message: "Patient or Doctor not found" });
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
    res.status(500).json({ message: error.message });
  }
};

//UpdatePrescription
const UpdatePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { patientId, doctorId, medicines, validUntil, notes } = req.body;

    const patient = await user.findById(patientId);
    const doctor = await user.findById(doctorId);

    if (!patientId || !doctorId) {
      return res.status(404).json({ message: "Patient or Doctor not found" });
    }

    const updatedPrescription = await prescription.findByIdAndUpdate(
      id,
      {
        patientId,
        doctorId,
        medicines,
        validUntil,
        notes,
      },
      { new: true }
    );

    if (!updatedPrescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    res.status(200).json("Prescription Updated Successfully");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//DeletePrescription
const DeletePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPrescription = await prescription.findByIdAndDelete(id);
    if (!deletedPrescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }
    res.status(200).json({ message: "Prescription deleted successfully" });
  } catch (error) {
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
