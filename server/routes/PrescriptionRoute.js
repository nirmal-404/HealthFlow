const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

//import controllers
const PrescriptionController = require("../controllers/PrescriptionController");

//Routes
router.use(protect); // Apply auth middleware to all prescription routes

// Search route must be before the ID route to avoid being treated as an ID
router.get("/search/:query", PrescriptionController.SearchPrescription);

// Doctor/Patient specific routes
router.get("/patient/:patientId", PrescriptionController.getAllPrescriptions);
router.get(
  "/patient-all/:patientId",
  PrescriptionController.getAllPrescriptionsByPatient
);
router.get(
  "/doctor/:doctorId",
  PrescriptionController.getAllPrescriptionsByDoctor
);

// Generic CRUD operations
router.post("/", PrescriptionController.CreatePrescription);
router.put("/:id", PrescriptionController.UpdatePrescription);
router.delete("/:id", PrescriptionController.DeletePrescription);

// This should be last since it's a catch-all for IDs
router.get("/:id", PrescriptionController.getPrescriptionById);

module.exports = router;
