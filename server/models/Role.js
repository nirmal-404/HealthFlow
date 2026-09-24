const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  permissions: [
    {
      entity: {
        type: String,
        required: true,
        // enum: ["user", "role", "assigned", "appointment", "record"],
      },
      action: {
        type: String,
        required: true,
        // enum: ["create", "view", "update", "delete"],
      },
      scope: {
        type: String,
        required: true,
        // enum: ["all", "own", "custom"], // Define allowed scopes
        // trim: true,
      },
    },
  ],
  isSystem: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware to prevent deletion of system roles
roleSchema.pre("deleteOne", async function (next) {
  const role = await this.model.findOne(this.getQuery());
  if (role && role.isSystem) {
    const error = new Error("System roles cannot be deleted");
    error.status = 403;
    return next(error);
  }
  next();
});

const Role = mongoose.model("Role", roleSchema);

module.exports = Role;
