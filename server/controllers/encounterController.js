const mongoose = require("mongoose");
const Encounter = require("../models/Encounter");
const Patient = require("../models/Patient");

// Create a new encounter
exports.createEncounter = async (req, res) => {
  try {
    const { recordId } = req.params;
    const doctorId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      return res.status(400).json({ message: "Invalid record ID" });
    }

    const patientExists = await Patient.findById(recordId);
    if (!patientExists) {
      return res.status(404).json({ message: "Patient record not found" });
    }

    const encounter = new Encounter({
      ...req.body,
      recordId,
      provider: doctorId,
    });

    const savedEncounter = await encounter.save();
    res.status(201).json({
      message: "Encounter created successfully",
      encounter: savedEncounter,
    });
  } catch (error) {
    console.error("Error creating encounter:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Get all encounters by recordId
exports.getEncountersByRecordId = async (req, res) => {
  try {
    const { recordId } = req.params;
    console.log("[API] Fetching encounters for recordId:", recordId);

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      console.warn("[API] Invalid recordId");
      return res.status(400).json({ message: "Invalid record ID" });
    }

    const encounters = await Encounter.find({ recordId })
      .populate("provider", "name") // Populate provider name from User model
      .sort({ dateTime: -1 }); // Sort by dateTime in descending order (newest first)

    console.log("[API] Found", encounters.length, "encounters");

    res.json(encounters);
  } catch (error) {
    console.error("Error fetching encounters:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Get a single encounter by ID
exports.getEncounterById = async (req, res) => {
  try {
    const { encounterId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(encounterId)) {
      return res.status(400).json({ message: "Invalid encounter ID" });
    }

    const encounter = await Encounter.findById(encounterId);
    if (!encounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    res.json(encounter);
  } catch (error) {
    console.error("Error fetching encounter:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Update a single encounter
exports.updateEncounter = async (req, res) => {
  try {
    const { encounterId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(encounterId)) {
      return res.status(400).json({ message: "Invalid encounter ID" });
    }

    const updatedEncounter = await Encounter.findByIdAndUpdate(
      encounterId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedEncounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    res.json({
      message: "Encounter updated successfully",
      encounter: updatedEncounter,
    });
  } catch (error) {
    console.error("Error updating encounter:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Delete a single encounter
exports.deleteEncounter = async (req, res) => {
  try {
    const { encounterId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(encounterId)) {
      return res.status(400).json({ message: "Invalid encounter ID" });
    }

    const deletedEncounter = await Encounter.findByIdAndDelete(encounterId);
    if (!deletedEncounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    res.json({
      message: "Encounter deleted successfully",
      encounter: deletedEncounter,
    });
  } catch (error) {
    console.error("Error deleting encounter:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
