const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  text: { type: String, required: true },
  type: { type: String, required: true },
  options: [{ type: String }],
});

module.exports = mongoose.model("Question", questionSchema);