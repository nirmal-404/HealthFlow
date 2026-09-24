const Feedback = require("../models/Feedback");
const User = require("../models/User");
const Question = require("../models/Question");
const runAI = require("../alModel");

const generateReport = async (req, res) => {
  const doctorId = "671d7f5e9d8e2b4c5f6a7b8c"; // Hardcoded for testing

  try {
    const feedbacks = await Feedback.find({ doctorId })
      .populate("patientId", "name email")
      .populate("answers.questionId", "text");

    if (!feedbacks || feedbacks.length === 0) {
      return res.status(200).json({ reportData: [], aiAnalysis: "No feedback available to analyze." });
    }

    const reportData = feedbacks.map(feedback => {
      const formattedFeedback = feedback.answers.map(a => {
        const questionText = a.questionId && a.questionId.text ? a.questionId.text : "Unknown Question";
        const answer = typeof a.answer === "object" ? (a.answer.value || "No") : a.answer;
        return {
          question: questionText,
          answer: answer,
        };
      });

      return {
        patient: feedback.patientId,
        feedback: formattedFeedback,
        comments: feedback.comments,
      };
    });

    const prompt = `
Analyze the following patient feedback to provide an overall summary of patient outcomes:

${JSON.stringify(reportData, null, 2)}

Ensure your response is formatted with the following sections: Trends, Common Issues, and Recommendations, as per the instructions provided in your system prompt.
`;
    const aiAnalysis = await runAI(prompt);

    res.status(200).json({ reportData, aiAnalysis });
  } catch (error) {
    console.error("[generateReport] Error:", error.message);
    res.status(500).json({ message: "Error generating report", error: error.message });
  }
};

module.exports = { generateReport };