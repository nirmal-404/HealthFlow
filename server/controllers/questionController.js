const Question = require("../models/Question");

const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching questions", error: error.message });
  }
};

const createQuestions = async (req, res) => {
  try {
    const questionsData = req.body; // Expecting an array of questions
    if (!Array.isArray(questionsData)) {
      return res.status(400).json({ message: "Request body must be an array of questions" });
    }

    // Validate each question
    const validQuestions = questionsData.map(q => ({
      _id: q._id,
      text: q.text,
      type: q.type,
      options: q.options || [],
    }));

    // Insert questions into the database
    const questions = await Question.insertMany(validQuestions, { ordered: false });
    res.status(201).json({ message: "Questions inserted successfully", questions });
  } catch (error) {
    console.error("[createQuestions] Error:", error.message);
    res.status(400).json({ message: "Error inserting questions", error: error.message });
  }
};

module.exports = { getQuestions, createQuestions };