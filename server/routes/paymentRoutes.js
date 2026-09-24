const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    initiatePayment, 
    handlePaymentNotification,
    handlePaymentSuccess
} = require('../controllers/paymentController');

router.post('/initiate', protect, initiatePayment);
router.post('/notify', handlePaymentNotification); // No auth for PayHere webhook
router.post('/success', handlePaymentSuccess); // Remove protect middleware since PayHere redirects here

module.exports = router;