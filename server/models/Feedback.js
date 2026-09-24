const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  questionId: {
    type: String,
    ref: "Question",
    required: true,
  },
  answer: mongoose.Mixed,
});

const feedbackSchema = new mongoose.Schema(
  {
    encounterId: {
      type: String,
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    answers: [answerSchema],
    comments: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);