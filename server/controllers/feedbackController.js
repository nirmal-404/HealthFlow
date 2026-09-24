const Feedback = require("../models/Feedback");
const User = require("../models/User");

// Fetch feedback for a hardcoded doctor (temporary)
const getDoctorFeedbacks = async (req, res) => {
  const doctorId = "671d7f5e9d8e2b4c5f6a7b8c"; // Hardcoded for testing
  try {
    const feedbacks = await Feedback.find({ doctorId })
      .populate("patientId", "name email")
      .populate("answers.questionId", "text");
    if (!feedbacks || feedbacks.length === 0) {
      return res.status(200).json([]);
    }
    res.status(200).json(feedbacks);
  } catch (error) {
    console.error("[getDoctorFeedbacks] Error:", error.message);
    res.status(500).json({ message: "Error fetching feedbacks", error: error.message });
  }
};

// Fetch metrics for a hardcoded doctor (temporary)
const getFeedbackMetrics = async (req, res) => {
  const doctorId = "671d7f5e9d8e2b4c5f6a7b8c"; // Hardcoded for testing
  try {
    const feedbacks = await Feedback.find({ doctorId });
    const totalFeedbackReceived = feedbacks.length;

    let satisfactionSum = 0;
    let satisfactionCount = 0;
    let treatmentSuccessSum = 0;
    let treatmentSuccessCount = 0;

    feedbacks.forEach(feedback => {
      feedback.answers.forEach(answer => {
        if (answer.questionId === "q10") {
          const value = parseInt(answer.answer);
          if (!isNaN(value)) {
            satisfactionSum += value;
            satisfactionCount++;
          }
        }
        if (answer.questionId === "q9" && answer.answer === "Yes") {
          treatmentSuccessSum++;
          treatmentSuccessCount++;
        } else if (answer.questionId === "q9") {
          treatmentSuccessCount++;
        }
      });
    });

    const patientSatisfactionRate = satisfactionCount > 0 ? ((satisfactionSum / (satisfactionCount * 5)) * 100).toFixed(2) + "%" : "0%";
    const treatmentSuccessRate = treatmentSuccessCount > 0 ? ((treatmentSuccessSum / treatmentSuccessCount) * 100).toFixed(2) + "%" : "0%";

    res.status(200).json({
      totalFeedbackReceived,
      patientSatisfactionRate,
      treatmentSuccessRate,
    });
  } catch (error) {
    console.error("[getFeedbackMetrics] Error:", error.message);
    res.status(500).json({ message: "Error fetching metrics", error: error.message });
  }
};

// Fetch feedback for a patient
const getPatientFeedbacks = async (req, res) => {
  const userId = req.user.id;
  try {
    const feedbacks = await Feedback.find({ patientId: userId })
      .populate("answers.questionId", "text");
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching feedbacks", error: error.message });
  }
};

const getFeedback = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const feedback = await Feedback.findById(id).populate("answers.questionId", "text");
    if (!feedback || feedback.patientId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized or feedback not found" });
    }
    res.status(200).json(feedback);
  } catch (error) {
    res.status(500).json({ message: "Error fetching feedback", error: error.message });
  }
};

const createFeedback = async (req, res) => {
  const { encounterId, answers, comments, doctorId } = req.body;
  const patientId = req.user.id;
  try {
    const feedback = await Feedback.create({
      encounterId,
      patientId,
      doctorId,
      answers,
      comments,
    });
    res.status(201).json(feedback);
  } catch (error) {
    res.status(400).json({ message: "Error creating feedback", error: error.message });
  }
};

const updateFeedback = async (req, res) => {
  const { id } = req.params;
  const { answers, comments } = req.body;
  const userId = req.user.id;
  try {
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    console.log(`[updateFeedback] userId: ${userId}, feedback.patientId: ${feedback.patientId.toString()}`); // Debug log
    if (feedback.patientId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized to update this feedback" });
    }
    const now = new Date();
    const createdAt = new Date(feedback.createdAt);
    const diffInMinutes = (now - createdAt) / (1000 * 60);
    if (diffInMinutes > 10) {
      return res.status(403).json({ message: "Feedback can only be edited within 10 minutes of submission" });
    }
    feedback.answers = answers;
    feedback.comments = comments;
    await feedback.save();
    res.status(200).json(feedback);
  } catch (error) {
    console.error("[updateFeedback] Error:", error.message);
    res.status(400).json({ message: "Error updating feedback", error: error.message });
  }
};

const deleteFeedback = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    console.log(`[deleteFeedback] userId: ${userId}, feedback.patientId: ${feedback.patientId.toString()}`); // Debug log
    if (feedback.patientId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized to delete this feedback" });
    }
    const now = new Date();
    const createdAt = new Date(feedback.createdAt);
    const diffInMinutes = (now - createdAt) / (1000 * 60);
    if (diffInMinutes > 10) {
      return res.status(403).json({ message: "Feedback can only be deleted within 10 minutes of submission" });
    }
    await Feedback.findByIdAndDelete(id);
    res.status(200).json({ message: "Feedback deleted successfully" });
  } catch (error) {
    console.error("[deleteFeedback] Error:", error.message);
    res.status(400).json({ message: "Error deleting feedback", error: error.message });
  }
};

module.exports = {
  getPatientFeedbacks,
  getFeedback,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  getDoctorFeedbacks,
  getFeedbackMetrics,
};