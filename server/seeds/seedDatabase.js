// seeds/seedDatabase.js
const mongoose = require("mongoose");
const Role = require("../models/Role");
const User = require("../models/User");
const Patient = require("../models/Patient");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected...");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// Seed roles
const seedRoles = async () => {
  try {
    // Define roles and permissions
    const roles = [
      {
        name: "sys_admin",
        permissions: [
          { entity: "user", action: "view", scope: "all" },
          { entity: "user", action: "delete", scope: "all" },
          { entity: "user", action: "update", scope: "own" },
          { entity: "role", action: "create", scope: "all" },
          { entity: "role", action: "view", scope: "all" },
          { entity: "role", action: "delete", scope: "all" },
        ],
        isSystem: true,
      },
      {
        name: "sys_patient",
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
        name: "sys_doctor",
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
    ];
    // Clear existing roles
    await Role.deleteMany({});
    console.log("Existing roles cleared.");

    // Insert new roles
    await Role.insertMany(roles);
    console.log("System roles seeded successfully.");
  } catch (error) {
    console.error("Error seeding roles:", error.message);
  } finally {
    mongoose.connection.close();
  }
};

const seedUsers = async () => {
  try {
    // Find roles by name
    const sysAdminRole = await Role.findOne({ name: "sys_admin" });
    const sysDoctorRole = await Role.findOne({ name: "sys_doctor" });
    const sysPatientRole = await Role.findOne({ name: "sys_patient" });

    if (!sysAdminRole || !sysDoctorRole || !sysPatientRole) {
      throw new Error("Required roles not found. Please seed roles first.");
    }

    // Clear existing users
    await User.deleteMany({});
    console.log("Existing users cleared.");

    try {
      const db = mongoose.connection.db;
      const usersCollection = db.collection("users");

      await usersCollection
        .dropIndex("nic_1")
        .catch((err) =>
          console.log("nic_1 index not found or already dropped.")
        );
      await usersCollection
        .dropIndex("email_1")
        .catch((err) =>
          console.log("email_1 index not found or already dropped.")
        );
      console.log("Indexes dropped successfully");
    } catch (err) {
      console.error("Error dropping indexes:", err);
    }
    // Hash passwords
    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create admin user
    const adminUser = new User({
      name: "Admin",
      email: "admin@example.com",
      mobile: "1234567890",
      password: hashedPassword,
      roles: [{ role: sysAdminRole._id }],
      lastActiveRole: sysAdminRole._id,
      authType: "traditional",
      lastLoginAt: new Date(),
      loginCount: 25,
      otpEnabled: false,
    });

    const doctorUsers = [
      new User({
        name: "John Doe",
        email: "doctor1@example.com",
        mobile: "1234567891",
        password: hashedPassword,
        roles: [{ role: sysDoctorRole._id }],
        lastActiveRole: sysDoctorRole._id,
        doctorInfo: {
          specialization: "Cardiology",
          licenseNumber: "DOC12345",
        },
        authType: "traditional",
        lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        loginCount: 42,
        otpEnabled: false,
      }),
      new User({
        name: "Jane Smith",
        email: "doctor2@example.com",
        mobile: "1234567892",
        password: hashedPassword,
        roles: [{ role: sysDoctorRole._id }],
        lastActiveRole: sysDoctorRole._id,
        doctorInfo: {
          specialization: "Neurology",
          licenseNumber: "DOC67890",
        },
        authType: "traditional",
        lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        loginCount: 38,
        otpEnabled: false,
      }),
    ];

    const patientUsers = [
      new User({
        name: "Patient One",
        email: "patient1@example.com",
        mobile: "1234567893",
        nic: "935600981V",
        password: hashedPassword,
        roles: [{ role: sysPatientRole._id }],
        lastActiveRole: sysPatientRole._id,
        authType: "traditional",
        lastLoginAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        loginCount: 12,
        otpEnabled: false,
      }),
      new User({
        name: "Patient Two",
        nic: "945781234V",
        email: "patient2@example.com",
        mobile: "1234567894",
        password: hashedPassword,
        roles: [{ role: sysPatientRole._id }],
        lastActiveRole: sysPatientRole._id,
        authType: "traditional",
        lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        loginCount: 5,
        otpEnabled: false,
      }),
    ];

    // Save all users to the database
    await adminUser.save();
    console.log("Admin user seeded successfully.");

    const savedDoctors = await User.insertMany(doctorUsers);
    console.log("Doctor users seeded successfully.");

    const savedPatients = await User.insertMany(patientUsers);
    console.log("Patient users seeded successfully.");
  } catch (error) {
    console.error("Error seeding users:", error.message);
  }
};

// Seed patients
const seedPatients = async () => {
  try {
    // Find doctors
    const doctor1 = await User.findOne({ email: "doctor1@example.com" });
    const doctor2 = await User.findOne({ email: "doctor2@example.com" });

    if (!doctor1 || !doctor2) {
      throw new Error("Doctors not found. Please seed users first.");
    }

    // Clear existing patients
    await Patient.deleteMany({});
    console.log("Existing patients cleared.");

    // Create patients for doctor1 (Cardiology - John Doe)
    const doctor1Patients = [
      new Patient({
        doctor: doctor1._id,
        nic: "857423691V",
        name: {
          firstName: "James",
          middleNames: ["Robert"],
          lastName: "Wilson",
        },
        dateOfBirth: "1985-07-15",
        gender: "Male",
        email: "patient1@example.com",
        phone: "0775468921",
        activeStatus: true,
        allergies: [
          {
            allergenName: "Penicillin",
            manifestation: "Skin rash",
          },
        ],
        pastMedicalHistory: [
          {
            condition: "Hypertension",
            onset: "2018-03-10",
            clinicalStatus: "Active",
          },
        ],
        regularMedications: [
          {
            medicationName: "Lisinopril",
            form: "Tablet",
            dosage: "10mg",
            route: "Oral",
            status: "Ongoing",
          },
        ],
      }),
      new Patient({
        doctor: doctor1._id,
        nic: "927536481V",
        name: {
          firstName: "Sarah",
          middleNames: [],
          lastName: "Johnson",
        },
        dateOfBirth: "1992-11-23",
        gender: "Female",
        email: "sarah.johnson@example.com",
        phone: "0713548762",
        activeStatus: true,
        pastMedicalHistory: [
          {
            condition: "Atrial Fibrillation",
            onset: "2020-05-18",
            clinicalStatus: "Active",
          },
        ],
        regularMedications: [
          {
            medicationName: "Warfarin",
            form: "Tablet",
            dosage: "5mg",
            route: "Oral",
            status: "Ongoing",
          },
        ],
      }),
      new Patient({
        doctor: doctor1._id,
        nic: "785612349V",
        name: {
          firstName: "Michael",
          middleNames: ["David"],
          lastName: "Brown",
        },
        dateOfBirth: "1978-03-29",
        gender: "Male",
        email: "patient2@example.com",
        phone: "0761234587",
        activeStatus: true,
        allergies: [
          {
            allergenName: "Aspirin",
            manifestation: "Stomach bleeding",
          },
        ],
        pastMedicalHistory: [
          {
            condition: "Coronary Artery Disease",
            onset: "2019-12-05",
            clinicalStatus: "Active",
          },
        ],
        regularMedications: [
          {
            medicationName: "Atorvastatin",
            form: "Tablet",
            dosage: "20mg",
            route: "Oral",
            status: "Ongoing",
          },
          {
            medicationName: "Metoprolol",
            form: "Tablet",
            dosage: "50mg",
            route: "Oral",
            status: "Ongoing",
          },
        ],
      }),
    ];

    // Create patients for doctor2 (Neurology - Jane Smith)
    const doctor2Patients = [
      new Patient({
        doctor: doctor2._id,
        nic: "785612349V",
        name: {
          firstName: "Emily",
          middleNames: ["Grace"],
          lastName: "Davis",
        },
        dateOfBirth: "1989-09-14",
        gender: "Female",
        email: "patient2@example.com",
        phone: "0723456789",
        activeStatus: true,
        pastMedicalHistory: [
          {
            condition: "Migraine",
            onset: "2015-02-21",
            clinicalStatus: "Active",
          },
        ],
        regularMedications: [
          {
            medicationName: "Sumatriptan",
            form: "Tablet",
            dosage: "50mg",
            route: "Oral",
            status: "As needed",
          },
        ],
      }),
      new Patient({
        doctor: doctor2._id,
        nic: "912345678V",
        name: {
          firstName: "Robert",
          middleNames: ["Thomas"],
          lastName: "Taylor",
        },
        dateOfBirth: "1991-12-03",
        gender: "Male",
        email: "robert.taylor@example.com",
        phone: "0763214589",
        activeStatus: true,
        pastMedicalHistory: [
          {
            condition: "Epilepsy",
            onset: "2010-06-15",
            clinicalStatus: "Active",
          },
        ],
        regularMedications: [
          {
            medicationName: "Levetiracetam",
            form: "Tablet",
            dosage: "500mg",
            route: "Oral",
            status: "Ongoing",
          },
        ],
      }),
      new Patient({
        doctor: doctor2._id,
        nic: "637891245V",
        name: {
          firstName: "Olivia",
          middleNames: [],
          lastName: "Martinez",
        },
        dateOfBirth: "1963-08-07",
        gender: "Female",
        email: "olivia.martinez@example.com",
        phone: "0789512634",
        activeStatus: true,
        allergies: [
          {
            allergenName: "Sulfa drugs",
            manifestation: "Anaphylaxis",
          },
        ],
        pastMedicalHistory: [
          {
            condition: "Multiple Sclerosis",
            onset: "2008-11-27",
            clinicalStatus: "Active",
          },
        ],
        regularMedications: [
          {
            medicationName: "Interferon beta-1a",
            form: "Injection",
            dosage: "30mcg",
            route: "Subcutaneous",
            status: "Ongoing",
          },
        ],
      }),
    ];

    // Save patients to database
    await Patient.insertMany([...doctor1Patients, ...doctor2Patients]);
    console.log("Patients seeded successfully.");
  } catch (error) {
    console.error("Error seeding patients:", error.message);
  }
};

// Run the seed script
const runSeeder = async () => {
  // await connectDB();
  // await seedRoles();
  // await connectDB();
  // await seedUsers();
  await connectDB();
  await seedPatients();
  console.log("Database seeding completed!");
  process.exit();
};

runSeeder();
