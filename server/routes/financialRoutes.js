const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getDoctorFinancialReport } = require('../controllers/financialController');

// Get financial report for a specific doctor
router.get('/doctors/:doctorId/report', getDoctorFinancialReport);

module.exports = router;