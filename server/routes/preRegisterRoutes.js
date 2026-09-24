const express = require("express");
const router = express.Router();
const {
  preRegisterUser,
  getPreRegistrationsByDoctor,
  deletePreRegistration,
  checkEmailPreRegistration,
} = require("../controllers/preRegisterController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, preRegisterUser);
router.get("/", protect, getPreRegistrationsByDoctor);
router.delete("/:id", protect, deletePreRegistration);

// Route to check if an email has pre-registrations - no auth required
router.get("/check", checkEmailPreRegistration);

module.exports = router;
