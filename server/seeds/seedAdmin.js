const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const Role = require("../models/Role");
const User = require("../models/User");

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/HealthFlow";

// Default First Admin Credentials
const ADMIN_NAME = process.env.INITIAL_ADMIN_NAME || "System Administrator";
const ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL || "admin@healthflow.com";
const ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || "Admin@12345";
const ADMIN_MOBILE = process.env.INITIAL_ADMIN_MOBILE || "0770000000";

const seedFirstAdmin = async () => {
  try {
    console.log("[Admin Seeder] Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("[Admin Seeder] Connected to MongoDB.");

    // 1. Ensure sys_admin role exists
    let adminRole = await Role.findOne({ name: "sys_admin" });

    if (!adminRole) {
      console.log("[Admin Seeder] sys_admin role not found, creating role...");
      adminRole = new Role({
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
      });
      await adminRole.save();
      console.log("[Admin Seeder] sys_admin role created.");
    }

    // 2. Check if admin user already exists
    let adminUser = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    if (adminUser) {
      console.log(`[Admin Seeder] Admin user '${ADMIN_EMAIL}' already exists. Updating role and password...`);
      adminUser.name = ADMIN_NAME;
      adminUser.password = hashedPassword;
      adminUser.roles = [{ role: adminRole._id }];
      adminUser.lastActiveRole = adminRole._id;
      adminUser.status = "active";
      adminUser.otpEnabled = false;
      await adminUser.save();
    } else {
      console.log(`[Admin Seeder] Creating new first admin user '${ADMIN_EMAIL}'...`);
      adminUser = new User({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL.toLowerCase(),
        mobile: ADMIN_MOBILE,
        password: hashedPassword,
        roles: [{ role: adminRole._id }],
        lastActiveRole: adminRole._id,
        authType: "traditional",
        status: "active",
        otpEnabled: false,
        lastLoginAt: new Date(),
        loginCount: 0,
      });
      await adminUser.save();
    }

    console.log("\n==============================================");
    console.log("🎉 First Admin User Account Seeded Successfully!");
    console.log("==============================================");
    console.log(` Name:     ${adminUser.name}`);
    console.log(` Email:    ${adminUser.email}`);
    console.log(` Password: ${ADMIN_PASSWORD}`);
    console.log(` Role:     sys_admin (ID: ${adminRole._id})`);
    console.log("==============================================\n");
  } catch (error) {
    console.error("[Admin Seeder] Error seeding admin user:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("[Admin Seeder] Database connection closed.");
    process.exit(0);
  }
};

seedFirstAdmin();
