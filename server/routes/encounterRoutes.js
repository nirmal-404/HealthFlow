const express = require("express");
const router = express.Router();
const { protect, checkPermission } = require("../middleware/authMiddleware");
const {
  createEncounter,
  getEncountersByRecordId,
  getEncounterById,
  updateEncounter,
  deleteEncounter,
} = require("../controllers/encounterController");

router.use(protect);

// CRUD routes
router.post("/:recordId", createEncounter);
router.get("/by-record/:recordId", getEncountersByRecordId);
router.get("/:encounterId", getEncounterById);
router.put("/:encounterId", updateEncounter);
router.delete("/:encounterId", deleteEncounter);

module.exports = router;
