const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Patient Schema
const patientSchema = new Schema(
  {
    doctor: { type: Schema.Types.ObjectId, ref: "User" },
    nic: { type: String },
    name: {
      firstName: { type: String, required: true },
      middleNames: { type: [String], default: [] },
      lastName: { type: String, required: true },
    },
    searchName: { type: String, index: true },
    dateOfBirth: { type: String, required: true },
    gender: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true },
    passportDetails: {
      number: { type: String }, // (for foreigners)
      issuedCountry: { type: String }, // Issuing country of the passport
    },
    activeStatus: { type: Boolean, required: true, default: true }, // Patient active status
    // Long-term medical information
    allergies: [
      {
        allergenName: { type: String }, // Allergen name
        manifestation: { type: String }, // allergic reaction
      },
    ],
    pastMedicalHistory: [
      {
        condition: { type: String }, // Medical condition
        onset: { type: String }, // Onset date of the condition
        clinicalStatus: { type: String }, // Current status (Active, Resolved)
      },
    ],
    regularMedications: [
      {
        medicationName: { type: String }, // Medication name
        form: { type: String }, // Form of the medication
        dosage: { type: String }, // Dosage information
        route: { type: String }, // Route of administration
        status: { type: String }, // Status (Ongoing, Discontinued)
      },
    ],
    pastSurgicalHistory: [
      {
        procedureName: { type: String }, // Name of the procedure
        date: { type: Date }, // Date of surgery
      },
    ],
    immunizations: [
      {
        vaccineName: { type: String }, // Vaccine name
        date: { type: Date }, // Date administered
      },
    ],
    behavioralRiskFactors: [
      {
        riskFactorName: { type: String }, // Name of the risk factor (e.g., Smoking)
        status: { type: String }, // Current status of the risk factor (Active, Resolved)
        duration: { type: String }, // Duration of the risk factor
        statusRecordedDate: { type: Date }, // Date when status was recorded
      },
    ],
    healthRiskAssessment: [
      {
        assessmentType: { type: String }, // Type of assessment (e.g., Cardiovascular)
        outcome: { type: String }, // Outcome of the assessment (e.g., High Risk)
        assessmentDate: { type: Date }, // Date of the assessment
      },
    ],
  },
  { timestamps: true } // Includes createdAt and updatedAt timestamps
);

patientSchema.pre("save", function (next) {
  // Check if any name field has been modified
  if (
    this.isModified("name.firstName") ||
    this.isModified("name.middleNames") ||
    this.isModified("name.lastName")
  ) {
    // Ensure middleNames is an array, in case it's undefined or null
    const middleNames = Array.isArray(this.name.middleNames)
      ? this.name.middleNames
      : [];

    // Update searchName
    const fullName = [this.name.firstName, ...middleNames, this.name.lastName]
      .join(" ")
      .toLowerCase();

    const initials = [
      this.name.firstName[0],
      ...middleNames.map((name) => name[0]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    this.searchName = `${fullName} ${initials}`;
  }

  next();
});

// Creating the model
const Patient = mongoose.model("Patient", patientSchema);

module.exports = Patient;
