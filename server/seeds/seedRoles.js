const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Role = require("../models/Role");

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/HealthFlow";

// Comprehensive definitions for all system roles used in HealthFlow
const systemRoles = [
  {
    name: "sys_admin",
    description: "System Administrator with full management access",
    permissions: [
      { entity: "user", action: "view", scope: "all" },
      { entity: "user", action: "create", scope: "all" },
      { entity: "user", action: "update", scope: "all" },
      { entity: "user", action: "delete", scope: "all" },
      { entity: "role", action: "create", scope: "all" },
      { entity: "role", action: "view", scope: "all" },
      { entity: "role", action: "update", scope: "all" },
      { entity: "role", action: "delete", scope: "all" },
      { entity: "activity", action: "view", scope: "all" },
      { entity: "finance", action: "view", scope: "all" },
    ],
    isSystem: true,
  },
  {
    name: "sys_doctor",
    description: "Licensed Healthcare Provider / Doctor",
    permissions: [
      { entity: "record", action: "create", scope: "own" },
      { entity: "record", action: "view", scope: "own" },
      { entity: "record", action: "update", scope: "own" },
      { entity: "record", action: "delete", scope: "own" },
      { entity: "encounter", action: "create", scope: "own" },
      { entity: "encounter", action: "view", scope: "own" },
      { entity: "encounter", action: "update", scope: "own" },
      { entity: "encounter", action: "delete", scope: "own" },
      { entity: "prescription", action: "create", scope: "own" },
      { entity: "prescription", action: "view", scope: "own" },
      { entity: "prescription", action: "update", scope: "own" },
      { entity: "prescription", action: "delete", scope: "own" },
      { entity: "document", action: "create", scope: "own" },
      { entity: "document", action: "view", scope: "own" },
      { entity: "document", action: "update", scope: "own" },
      { entity: "document", action: "delete", scope: "own" },
      { entity: "appointment", action: "view", scope: "linked" },
      { entity: "doctorSchedule", action: "create", scope: "own" },
      { entity: "doctorSchedule", action: "view", scope: "own" },
      { entity: "doctorSchedule", action: "update", scope: "own" },
      { entity: "doctorSchedule", action: "delete", scope: "own" },
      { entity: "feedback", action: "view", scope: "own" },
      { entity: "user", action: "view", scope: "own" },
      { entity: "user", action: "update", scope: "own" },
      { entity: "user", action: "delete", scope: "own" },
      { entity: "role", action: "create", scope: "own" },
      { entity: "role", action: "view", scope: "own" },
      { entity: "role", action: "update", scope: "own" },
      { entity: "role", action: "delete", scope: "own" },
      { entity: "preregister", action: "create", scope: "own" },
      { entity: "preregister", action: "view", scope: "own" },
      { entity: "preregister", action: "delete", scope: "own" },
      { entity: "question", action: "view", scope: "all" },
    ],
    isSystem: true,
  },
  {
    name: "sys_patient",
    description: "Registered Patient / Telemedicine Service User",
    permissions: [
      { entity: "user", action: "view", scope: "own" },
      { entity: "user", action: "delete", scope: "own" },
      { entity: "user", action: "update", scope: "own" },
      { entity: "record", action: "view", scope: "own" },
      { entity: "record", action: "view", scope: "linked" },
      { entity: "encounter", action: "view", scope: "linked" },
      { entity: "prescription", action: "view", scope: "linked" },
      { entity: "appointment", action: "create", scope: "own" },
      { entity: "appointment", action: "view", scope: "own" },
      { entity: "document", action: "upload", scope: "own" },
      { entity: "document", action: "view", scope: "own" },
      { entity: "feedback", action: "create", scope: "own" },
      { entity: "feedback", action: "view", scope: "own" },
      { entity: "question", action: "create", scope: "own" },
      { entity: "question", action: "view", scope: "own" },
    ],
    isSystem: true,
  },
  {
    name: "sys_staff",
    description: "Clinic Staff Member / Assistant",
    permissions: [
      { entity: "user", action: "view", scope: "own" },
      { entity: "user", action: "update", scope: "own" },
      { entity: "appointment", action: "view", scope: "linked" },
      { entity: "appointment", action: "create", scope: "linked" },
      { entity: "document", action: "view", scope: "linked" },
      { entity: "patient", action: "view", scope: "linked" },
    ],
    isSystem: true,
  },
];

const seedRoles = async () => {
  try {
    console.log("[Role Seeder] Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("[Role Seeder] Connected to MongoDB at:", MONGO_URI);

    console.log("[Role Seeder] Upserting system roles...");

    for (const roleData of systemRoles) {
      const updatedRole = await Role.findOneAndUpdate(
        { name: roleData.name },
        {
          $set: {
            description: roleData.description,
            permissions: roleData.permissions,
            isSystem: roleData.isSystem,
          },
        },
        { upsert: true, new: true }
      );
      console.log(`[Role Seeder] Role '${updatedRole.name}' seeded successfully (ID: ${updatedRole._id})`);
    }

    console.log("[Role Seeder] All system roles seeded successfully!");
  } catch (error) {
    console.error("[Role Seeder] Seeding error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("[Role Seeder] Database connection closed.");
    process.exit(0);
  }
};

seedRoles();
