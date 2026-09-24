const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Encounter Schema
const encounterSchema = new Schema(
  {
    recordId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    }, // Reference to the Patient model
    dateTime: {
      type: Date,
      required: true,
    },
    provider: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reasonForEncounter: {
      type: String,
      required: true,
    }, // Reason for the encounter (e.g., flu symptoms, routine checkup)
    diagnosis: {
      type: String,
      required: true,
    }, // Diagnosis for this encounter (e.g., flu, hypertension)
    prescription: [
      {
        type: Schema.Types.ObjectId,
        ref: "Prescription",
      },
    ],
    testsOrdered: [
      {
        testName: {
          type: String,
        }, // Name of the test ordered (e.g., blood test, X-ray)
        testDate: {
          type: Date,
        }, // Date when the test was ordered
        testResult: {
          type: String, // Result of the test (e.g., negative, positive, pending)
        },
        provider: {
          type: String,
        }, // Healthcare provider ordering the test
      },
    ],
    proceduresPerformed: [
      {
        procedureName: {
          type: String,
        }, // Name of the procedure performed (e.g., blood draw, surgery)
        procedureDate: {
          type: Date,
        }, // Date when the procedure was performed
        procedureOutcome: {
          type: String, // Outcome of the procedure (e.g., successful, complications)
        },
      },
    ],
    followUpCarePlan: {
      category: { type: String },
      description: {
        type: String,
      },
      followUpDate: {
        type: Date,
      },
    },

    additionalNotes: {
      type: String,
    },
  },
  { timestamps: true }
);

encounterSchema.index({ recordId: 1 });

// Creating the model
const Encounter = mongoose.model("Encounter", encounterSchema);

module.exports = Encounter;
