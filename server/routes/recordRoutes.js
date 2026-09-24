const express = require("express");
const router = express.Router();
const { protect, checkPermission } = require("../middleware/authMiddleware");
const {
  createPatientRecord,
  getRecordsByDoctor,
  getRecordById,
  deleteRecord,
  updateRecord,
  getLinkRecord,
} = require("../controllers/recordController");

// Protected routes - require authentication
router.use(protect);

// create a patient record
router.post(
  "/",
  checkPermission("record", "create", ["own"]),
  (req, res, next) => {
    console.log("POST request to create patient record received");
    next();
  },
  createPatientRecord
);

router.get(
  "/doctor",
  checkPermission("record", "view", ["own", "linked"]),
  (req, res, next) => {
    console.log("GET request for records by doctor received");
    next();
  },
  getRecordsByDoctor
);

// Role-specific routes - must come before general recordId route
router.get(
  "/link",
  checkPermission("record", "view", ["linked"]),
  getLinkRecord
);

router.get(
  "/:recordId",
  checkPermission("record", "view", ["own", "linked"]),
  (req, res, next) => {
    console.log(
      "GET request for record details received, recordId:",
      req.params.recordId
    );
    next();
  },
  getRecordById
);

// delete a patient record
router.delete(
  "/:recordId",
  checkPermission("record", "delete", ["own"]),
  (req, res, next) => {
    console.log("DELETE request to delete patient record received");
    next();
  },
  deleteRecord
);

// update a patient record
router.patch(
  "/:recordId",
  checkPermission("record", "update", ["own", "linked"]),
  (req, res, next) => {
    console.log("PATCH request to update patient record received");
    next();
  },
  updateRecord
);

module.exports = router;
