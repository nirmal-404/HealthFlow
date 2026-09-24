const express = require("express");
const router = express.Router();
const {
  getPatientFeedbacks,
  getFeedback,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  getDoctorFeedbacks,
  getFeedbackMetrics,
} = require("../controllers/feedbackController");
const { getQuestions, createQuestions } = require("../controllers/questionController");
const { generateReport } = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");

router.route("/patient/me").get(protect, getPatientFeedbacks);
router.route("/doctor/me").get(getDoctorFeedbacks);
router.route("/metrics/me").get(getFeedbackMetrics);
router.route("/questions/all").get(getQuestions);
router.route("/questions").post(createQuestions);
router.route("/report/generate").get(generateReport);
router.route("/").post(protect, createFeedback);
router
  .route("/:id")
  .get(protect, getFeedback)
  .put(protect, updateFeedback)
  .delete(protect, deleteFeedback);



module.exports = router;