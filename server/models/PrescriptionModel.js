const mongoose = require("mongoose");
const { Schema } = mongoose;

const prescriptionSchema = new mongoose.Schema(
  {
    medicines: [
      {
        medicineName: {
          type: String,
          required: true,
        },
        dosage: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        frequency: {
          type: String,
          required: true,
        },
        instructions: {
          type: String,
          required: true,
        },
      },
    ],
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dateIssued: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      required: true,
    },
  },
  { collection: "prescription" }
);

module.exports = mongoose.model("prescription", prescriptionSchema);
