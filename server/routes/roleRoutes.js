const express = require("express");
const {
  viewCustomRolesByDoctor,
  createCustomRole,
  viewCustomRoles,
  updateCustomRole,
  deleteCustomRole,
} = require("../controllers/roleController");
const { protect, checkPermission } = require("../middleware/authMiddleware");

const router = express.Router();

// ------------------- Doctor Routes -------------------

// Create a custom role
router.post("/custom", protect, createCustomRole);

// View all custom roles grouped by doctor (admin functionality)
router.get("/custom/by-doctor", protect, viewCustomRolesByDoctor);

// View custom roles created by the logged-in doctor
router.get("/custom", protect, viewCustomRoles);

// Update a custom role by ID
router.put("/custom/:roleId", protect, updateCustomRole);

// Delete a custom role by ID
router.delete("/custom/:roleId", protect, deleteCustomRole);

module.exports = router;
