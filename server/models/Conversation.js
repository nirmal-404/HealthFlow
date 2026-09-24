const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageTimestamp: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  }
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps
});

// Ensure that conversations between the same users are not duplicated
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);