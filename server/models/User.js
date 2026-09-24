//User.js model
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nic: { type: String, default: undefined },
    email: { type: String, default: undefined },
    mobile: { type: String, required: true },
    password: { type: String }, // Not required anymore since OAuth users won't have passwords
    roles: [
      {
        role: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Role",
          required: true,
        },
        assignedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: false, // Not required for self-registered roles (e.g., admin, patient)
        },
      },
    ],
    lastActiveRole: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
    // Subdocument for Doctor
    doctorInfo: {
      specialization: { type: String },
      licenseNumber: { type: String },
      // Subscription: { type: Schema.Types.ObjectId, ref: "Subscription" },
    },
    authType: {
      type: String,
      enum: ["traditional", "google", "facebook"],
      required: true,
      default: "traditional",
    },
    oauthProviderId: { type: String }, // Store OAuth provider's user ID

    // Account Status & Audit Info
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending"],
      default: "active",
    },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Login & Activity Tracking
    lastLoginAt: { type: Date },
    lastLoginIP: { type: String },
    loginCount: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    // Security Features
    otpSecret: { type: String }, // For 2FA
    otpEnabled: { type: Boolean, default: true },
    verificationToken: { type: String },
    verificationTokenExpires: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { email: { $exists: true, $ne: null } },
  }
);

userSchema.index(
  { nic: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { nic: { $exists: true, $ne: null } },
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
