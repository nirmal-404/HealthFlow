const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const User = require("../models/User");

exports.createPatientRecord = async (req, res) => {
  try {
    const doctorId = req.dataAccess?.doctorId;
    console.log("Inside record controller: Create patient record");

    // Get the doctor ID from the authenticated user
    if (!mongoose.isValidObjectId(doctorId)) {
      console.log("Invalid doctor ID:", doctorId);
      return res.status(400).json({ message: "Invalid doctor ID" });
    }

    console.log("Valid doctor ID:", doctorId);

    // Destructure the request body
    const { name, dateOfBirth, gender, email, phone, ...formData } = req.body;

    console.log("Request body received:", req.body);

    // Prepare patient record
    const patientRecord = {
      ...req.body,
      doctor: new mongoose.Types.ObjectId(doctorId),
      activeStatus: true,
    };

    // Clean up empty objects in arrays
    const cleanArrayFields = (array, requiredFields) => {
      if (!Array.isArray(array)) return undefined;

      // Filter out empty objects and validate required fields
      const cleanedArray = array.filter((item) => {
        // First check if item is defined and is an object
        if (
          !item ||
          typeof item !== "object" ||
          Object.keys(item).length === 0
        ) {
          return false;
        }

        // Check if ALL required fields exist and have valid values
        const hasAllRequiredFields = requiredFields.every((field) => {
          const value = item[field];
          return value !== null && value !== undefined && value !== "";
        });

        // Check if ANY field has a value - this catches objects with non-required fields populated
        const hasAnyValue = Object.values(item).some(
          (value) => value !== null && value !== undefined && value !== ""
        );

        return hasAllRequiredFields && hasAnyValue;
      });

      return cleanedArray.length > 0 ? cleanedArray : undefined;
    };

    // Clean up each array field and only include non-empty arrays
    const cleanedArrays = {
      allergies: cleanArrayFields(patientRecord.allergies, [
        "allergenName",
        "manifestation",
      ]),
      pastMedicalHistory: cleanArrayFields(patientRecord.pastMedicalHistory, [
        "condition",
        "onset",
        "clinicalStatus",
      ]),
      regularMedications: cleanArrayFields(patientRecord.regularMedications, [
        "medicationName",
        "form",
        "dosage",
        "route",
        "status",
      ]),
      pastSurgicalHistory: cleanArrayFields(patientRecord.pastSurgicalHistory, [
        "procedureName",
        "date",
      ]),
      immunizations: cleanArrayFields(patientRecord.immunizations, [
        "vaccineName",
        "date",
      ]),
      behavioralRiskFactors: cleanArrayFields(
        patientRecord.behavioralRiskFactors,
        ["riskFactorName", "status", "duration", "statusRecordedDate"]
      ),
      healthRiskAssessment: cleanArrayFields(
        patientRecord.healthRiskAssessment,
        ["assessmentType", "outcome", "assessmentDate"]
      ),
    };

    // Only include non-undefined array fields in the final record
    Object.entries(cleanedArrays).forEach(([key, value]) => {
      if (value === undefined) {
        delete patientRecord[key];
      } else {
        patientRecord[key] = value;
      }
    });

    // Clean up passport details if both fields are empty
    if (
      patientRecord.passportDetails &&
      (!patientRecord.passportDetails.number ||
        patientRecord.passportDetails.number.trim() === "") &&
      (!patientRecord.passportDetails.issuedCountry ||
        patientRecord.passportDetails.issuedCountry.trim() === "")
    ) {
      patientRecord.passportDetails = null;
    }

    console.log("Patient record prepared:", patientRecord);

    // Create and save new patient
    const newPatient = new Patient(patientRecord);
    const savedPatient = await newPatient.save();

    console.log("Patient record created successfully:", savedPatient);

    // Transform the saved patient to include fullName
    const getFullName = (patient) => {
      const fullNameParts = [
        patient.name.firstName,
        ...(patient.name.middleNames || []),
        patient.name.lastName,
      ];
      return fullNameParts.filter(Boolean).join(" ");
    };

    const transformedPatient = {
      _id: savedPatient._id,
      fullName: getFullName(savedPatient),
      dateOfBirth: savedPatient.dateOfBirth,
      gender: savedPatient.gender,
      phone: savedPatient.phone,
      activeStatus: savedPatient.activeStatus,
      createdAt: savedPatient.createdAt,
    };

    // Respond with success
    res.status(201).json({
      message: "Patient record created successfully",
      record: transformedPatient,
    });
  } catch (error) {
    // Handle mongoose validation errors
    if (error instanceof mongoose.Error.ValidationError) {
      console.error("Validation error:", error);
      return res.status(400).json({
        message: "Validation Error",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      console.log("Duplicate Fields:", Object.keys(error.keyPattern || {}));
      return res.status(409).json({
        message: "A patient with similar unique identifiers already exists",
        duplicateFields: Object.keys(error.keyPattern || {}),
      });
    }

    // Log and respond with generic server error
    console.error("Error creating patient record:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getRecordsByDoctor = async (req, res) => {
  try {
    console.log("Inside getRecordsByDoctor controller");
    const doctorId = req.dataAccess?.doctorId;
    console.log("Doctor ID:", doctorId);

    // Find all patient records for this doctor
    const patients = await Patient.find({ doctor: doctorId })
      .select("-__v")
      .lean();

    console.log("Found patients:", patients);

    const getFullName = (patient) => {
      const fullNameParts = [
        patient.name.firstName,
        ...(patient.name.middleNames || []),
        patient.name.lastName,
      ];
      return fullNameParts.filter(Boolean).join(" ");
    };

    // Transform data if needed (optional)
    const transformedPatients = patients.map((patient) => ({
      _id: patient._id,
      fullName: getFullName(patient),
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      phone: patient.phone,
      activeStatus: patient.activeStatus,
      createdAt: patient.createdAt,
    }));

    console.log("Transformed patient data:", transformedPatients);
    res.json(transformedPatients);

    console.log("Transformed patient data was sent");
  } catch (error) {
    console.error("Error fetching patient records:", error);
    res.status(500).json({
      message: "Error fetching patient records",
      error: error.message,
    });
  }
};

exports.deleteRecord = async (req, res) => {
  const { recordId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    return res.status(404).json({ error: "No such ehr" });
  }

  const deletedRecord = await Patient.findOneAndDelete({ _id: recordId });

  if (!deletedRecord) {
    return res.status(404).json({ error: "No such ehr" });
  }
  res.status(200).json({
    message: "Record and associated encounters deleted successfully",
    deletedRecord,
    // deletedEncountersCount: deletedEncounters.deletedCount,
  });
};

exports.updateRecord = async (req, res) => {
  const { recordId } = req.params;
  const updatedData = req.body;

  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    return res.status(400).json({ error: "Invalid record ID" });
  }

  try {
    // Clean array fields before updating
    const cleanArrayFields = (array, requiredFields) => {
      if (!Array.isArray(array)) return undefined;

      // Filter out empty objects and validate required fields
      const cleanedArray = array.filter((item) => {
        // First check if item is defined and is an object
        if (
          !item ||
          typeof item !== "object" ||
          Object.keys(item).length === 0
        ) {
          return false;
        }

        // Check if ALL required fields exist and have valid values
        const hasAllRequiredFields = requiredFields.every((field) => {
          const value = item[field];
          return value !== null && value !== undefined && value !== "";
        });

        // Check if ANY field has a value - this catches objects with non-required fields populated
        const hasAnyValue = Object.values(item).some(
          (value) => value !== null && value !== undefined && value !== ""
        );

        return hasAllRequiredFields && hasAnyValue;
      });

      return cleanedArray.length > 0 ? cleanedArray : undefined;
    };

    // Clean each array field in the update data
    if (updatedData.allergies) {
      updatedData.allergies = cleanArrayFields(updatedData.allergies, [
        "allergenName",
        "manifestation",
      ]);
    }
    if (updatedData.pastMedicalHistory) {
      updatedData.pastMedicalHistory = cleanArrayFields(
        updatedData.pastMedicalHistory,
        ["condition", "onset", "clinicalStatus"]
      );
    }
    if (updatedData.regularMedications) {
      updatedData.regularMedications = cleanArrayFields(
        updatedData.regularMedications,
        ["medicationName", "form", "dosage", "route", "status"]
      );
    }
    if (updatedData.pastSurgicalHistory) {
      updatedData.pastSurgicalHistory = cleanArrayFields(
        updatedData.pastSurgicalHistory,
        ["procedureName", "date"]
      );
    }
    if (updatedData.immunizations) {
      updatedData.immunizations = cleanArrayFields(updatedData.immunizations, [
        "vaccineName",
        "date",
      ]);
    }
    if (updatedData.behavioralRiskFactors) {
      updatedData.behavioralRiskFactors = cleanArrayFields(
        updatedData.behavioralRiskFactors,
        ["riskFactorName", "status", "duration", "statusRecordedDate"]
      );
    }
    if (updatedData.healthRiskAssessment) {
      updatedData.healthRiskAssessment = cleanArrayFields(
        updatedData.healthRiskAssessment,
        ["assessmentType", "outcome", "assessmentDate"]
      );
    }

    // Remove any undefined array fields from the update
    Object.keys(updatedData).forEach((key) => {
      if (updatedData[key] === undefined) {
        delete updatedData[key];
      }
    });

    // Find and update the patient record
    const updatedPatient = await Patient.findByIdAndUpdate(
      recordId,
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    if (!updatedPatient) {
      return res.status(404).json({ error: "Patient record not found" });
    }

    // Transform the response to match the expected format
    const transformedPatient = {
      id: updatedPatient._id,
      fullName: `${
        updatedPatient.name.firstName
      } ${updatedPatient.name.middleNames.join(" ")} ${
        updatedPatient.name.lastName
      }`,
      firstName: updatedPatient.name.firstName,
      middleNames: updatedPatient.name.middleNames,
      lastName: updatedPatient.name.lastName,
      searchName: updatedPatient.searchName,
      dateOfBirth: updatedPatient.dateOfBirth,
      gender: updatedPatient.gender,
      email: updatedPatient.email,
      phone: updatedPatient.phone,
      nic: updatedPatient.nic,
      activeStatus: updatedPatient.activeStatus,
      passportInfo: updatedPatient.passportDetails || {
        number: "",
        issuedCountry: "",
      },
      allergies: updatedPatient.allergies || [],
      pastMedicalConditions: updatedPatient.pastMedicalHistory || [],
      regularMedications: updatedPatient.regularMedications || [],
      surgicalHistory: updatedPatient.pastSurgicalHistory || [],
      immunizations: updatedPatient.immunizations || [],
      behavioralRiskFactors: updatedPatient.behavioralRiskFactors || [],
      healthRiskAssessments: updatedPatient.healthRiskAssessment || [],
    };

    res.status(200).json({
      message: "Patient record updated successfully",
      record: transformedPatient,
    });
  } catch (error) {
    console.error("Error updating patient record:", error);
    res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

exports.getRecordById = async (req, res) => {
  try {
    const { recordId } = req.params;
    console.log("Fetching patient record by ID:", recordId);

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      console.log("Invalid patient record ID:", recordId);
      return res.status(400).json({
        message: "Invalid patient record ID",
        error: true,
      });
    }

    // Find patient by ID and populate doctor details
    const patient = await Patient.findById(recordId).lean(); // Convert to plain JavaScript object for easier manipulation

    // If no patient found
    if (!patient) {
      console.log("Patient not found for ID:", id);
      return res.status(404).json({
        message: "Patient record not found",
        error: true,
      });
    }

    // Prepare a comprehensive response
    const patientRecord = {
      id: patient._id,
      fullName: `${patient.name.firstName} ${patient.name.middleNames.join(
        " "
      )} ${patient.name.lastName}`,
      firstName: patient.name.firstName,
      middleNames: patient.name.middleNames,
      lastName: patient.name.lastName,
      searchName: patient.searchName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      email: patient.email,
      phone: patient.phone,
      nic: patient.nic,
      activeStatus: patient.activeStatus,
      passportInfo: patient.passportDetails
        ? {
            number: patient.passportDetails.number,
            issuedCountry: patient.passportDetails.issuedCountry,
          }
        : null,

      allergies: patient.allergies.map((allergy) => ({
        allergenName: allergy.allergenName,
        manifestation: allergy.manifestation,
      })),

      pastMedicalConditions: patient.pastMedicalHistory.map((condition) => ({
        condition: condition.condition,
        onset: condition.onset,
        clinicalStatus: condition.clinicalStatus,
      })),

      regularMedications: patient.regularMedications.map((med) => ({
        medicationName: med.medicationName,
        form: med.form,
        dosage: med.dosage,
        route: med.route,
        status: med.status,
      })),

      surgicalHistory: patient.pastSurgicalHistory.map((surgery) => ({
        procedureName: surgery.procedureName,
        date: surgery.date,
      })),

      immunizations: patient.immunizations.map((vaccine) => ({
        vaccineName: vaccine.vaccineName,
        date: vaccine.date,
      })),

      behavioralRiskFactors: patient.behavioralRiskFactors.map((risk) => ({
        riskFactorName: risk.riskFactorName,
        status: risk.status,
        duration: risk.duration,
        statusRecordedDate: risk.statusRecordedDate,
      })),

      healthRiskAssessments: patient.healthRiskAssessment.map((assessment) => ({
        assessmentType: assessment.assessmentType,
        outcome: assessment.outcome,
        assessmentDate: assessment.assessmentDate,
      })),
    };

    console.log("Patient record:", patientRecord);
    res.status(200).json({
      message: "Patient record retrieved successfully",
      record: patientRecord,
      error: false,
    });
  } catch (error) {
    console.error("Error retrieving patient record:", error);
    res.status(500).json({
      message: "Internal server error while retrieving patient record",
      error: true,
      details: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

exports.searchPatients = async (req, res) => {
  try {
    const { query } = req.query;

    console.log("Searching for patients with query:", query);

    if (!query) {
      console.log("No query provided for search");
      return res.status(400).json({
        message: "Search query is required",
        error: true,
      });
    }

    const patients = await Patient.find({
      searchName: { $regex: query.toLowerCase(), $options: "i" },
      doctor: req.user._id, // Ensure only doctor's own patients are returned
    })
      .select("name email phone dateOfBirth")
      .limit(10); // Limit to 10 results

    console.log("Search results:", patients);

    res.status(200).json({
      message: "Patient search completed",
      data: patients.map((patient) => ({
        id: patient._id,
        fullName: `${patient.name.firstName} ${patient.name.middleNames.join(
          " "
        )} ${patient.name.lastName}`,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        nic: patient.nic,
      })),
      error: false,
    });
  } catch (error) {
    console.error("Error searching patients:", error);
    res.status(500).json({
      message: "Internal server error during patient search",
      error: true,
    });
  }
};

exports.getLinkRecord = async (req, res) => {
  try {
    // First get the user's NIC and email
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        error: true,
      });
    }

    // Find patient records that match either the NIC or email
    const patientRecords = await Patient.find({
      $or: [{ nic: user.nic }, { email: user.email }],
    });

    if (!patientRecords || patientRecords.length === 0) {
      return res.status(404).json({
        message: "No linked patient records found",
        error: true,
      });
    }

    res.status(200).json({
      recordIds: patientRecords.map((record) => record._id),
    });
  } catch (error) {
    console.error("Error getting linked patient records:", error);
    res.status(500).json({
      message: "Internal server error while getting patient records",
      error: true,
    });
  }
};
