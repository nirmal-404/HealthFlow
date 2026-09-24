const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getPatientByNIC, getAgeGenderDistribution } = require('../controllers/patientController');

// Routes related to patient data
router.get('/nic/:nic', getPatientByNIC);
router.get('/age-gender-distribution', protect, getAgeGenderDistribution);

module.exports = router;