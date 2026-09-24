// models/PreRegisteredUser.js
const mongoose = require("mongoose");

const preRegisteredUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isRegistered: {
      type: Boolean,
      default: false,
    },
    registeredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

preRegisteredUserSchema.index(
  { email: 1, role: 1, assignedBy: 1 },
  { unique: true }
);

const PreRegisteredUser = mongoose.model(
  "PreRegisteredUser",
  preRegisteredUserSchema
);

module.exports = PreRegisteredUser;
