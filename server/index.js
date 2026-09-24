const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("./config/DB");

const appointmentRoutes = require("./routes/appointmentRoutes");
const encounterRoutes = require("./routes/encounterRoutes");
const prescriptionRoutes = require("./routes/PrescriptionRoute");
const aiModelRoute = require("./routes/aiModelRoute");
const drugsRoute = require("./routes/drugsdb");
const authRoutes = require("./routes/authRoutes");
const recordRoutes = require("./routes/recordRoutes");
const DocRoutes = require("./routes/DocumentRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes"); // Add this line to import feedbackRoutes
const roleRoutes = require("./routes/roleRoutes");
const preRegisterRoutes = require("./routes/preRegisterRoutes");
const chatRoutes = require("./routes/chatRoutes");
const patientRoutes = require("./routes/patientRoutes");
const financialRoutes = require("./routes/financialRoutes"); // Import financial routes
const paymentRoutes = require("./routes/paymentRoutes"); // Import payment routes
const userRoutes = require("./routes/userRoutes"); // Import admin routes
const passport = require("./config/passport");
const helmet = require("helmet");

const app = express();
const PORT = process.env.PORT || 5002;

// Load environment variables
dotenv.config();

// DB Connection
connectDB();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS Configuration - Allow PayHere notifications
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://sandbox.payhere.lk",
      "https://www.payhere.lk",
      "http://192.168.172.176:3000"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(passport.initialize());


// Utility to sanitize sensitive body parameters for logging
const sanitizeForLogging = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForLogging);

  const sensitiveKeys = [
    "password",
    "confirmpassword",
    "token",
    "accesstoken",
    "refreshtoken",
    "otp",
    "secret",
    "creditcard",
    "cvv",
    "authorization",
  ];

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// Log all incoming requests safely
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("Request body:", JSON.stringify(sanitizeForLogging(req.body), null, 2));
  }
  next();
});

// Routes
console.log("Setting up routes...");
app.use("/api/auth", authRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/drugs", drugsRoute);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/document", DocRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/preregistration", preRegisterRoutes);
app.use("/api/encounters", encounterRoutes);
app.use("/api/finance", financialRoutes); // Use financial routes
app.use("/api/payments", paymentRoutes); // Use payment routes
app.use("/api/users", userRoutes);

require("./aiModel");
app.use("/api/ai", aiModelRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res
    .status(500)
    .json({ message: "Internal server error", error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
