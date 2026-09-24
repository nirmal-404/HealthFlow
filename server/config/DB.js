const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Rebuild indexes for User model
    console.log("Rebuilding indexes for User collection...");
    await User.collection.dropIndexes();

    // Create index for email - only enforced when email exists
    await User.collection.createIndex(
      { email: 1 },
      {
        unique: true,
        partialFilterExpression: { email: { $exists: true } },
      }
    );

    // Create index for NIC - only enforced when NIC exists
    await User.collection.createIndex(
      { nic: 1 },
      {
        unique: true,
        partialFilterExpression: { nic: { $exists: true } },
      }
    );
    console.log("User collection indexes rebuilt successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
