const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// All chat routes require authentication
router.use(protect);

// Get all conversations for the current user
router.get('/conversations', chatController.getConversations);

// Get messages for a specific conversation
router.get('/messages/:conversationId', chatController.getMessages);

// Send a new message
router.post('/messages', chatController.sendMessage);

// Get or create a conversation with another user
router.get('/conversation/:userId', chatController.getOrCreateConversation);

// Mark messages in a conversation as read
router.put('/messages/:conversationId/read', chatController.markAsRead);

// Search for users to start a conversation with
router.get('/users/search', chatController.searchUsers);

module.exports = router;