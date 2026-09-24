const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    encrypted: true // Flag to indicate content is encrypted
  },
  read: {
    type: Boolean,
    default: false
  },
  // This will help group messages in conversations
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps
});

module.exports = mongoose.model('Message', messageSchema);