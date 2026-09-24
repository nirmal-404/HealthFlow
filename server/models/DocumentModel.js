const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  patientid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: [true, "Patient ID is required"],
  },
  doctorid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Doctor ID is required"],
  },
  documentName: {
    type: String,
    required: [true, "Document name is required"],
    trim: true,
  },
  documentUrl: {
    type: String,
    required: [true, "Document URL is required"],
  },
  documentType: {
    type: String,
    enum: {
      values: ["Scan", "Lab Report", "Prescription", "System Generated"],
      message: "{VALUE} is not a valid document type",
    },
    required: [true, "Document type is required"],
  },
  status: {
    type: String,
    enum: {
      values: ["Pending", "Doctor Review", "Approved", "Rejected"],
      message: "{VALUE} is not a valid status",
    },
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  modifiedAt: {
    type: Date,
    default: null,
  },
});

// Add index for faster queries
documentSchema.index({ patientid: 1, doctorid: 1 });
documentSchema.index({ createdAt: -1 });

const Document = mongoose.model("Document", documentSchema);

module.exports = Document;
