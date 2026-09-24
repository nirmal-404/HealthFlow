const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');
const { ObjectId } = mongoose.Types;

// Get all conversations for a user
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id; // Changed from req.user._id to req.user.id

    // Find all conversations where the current user is a participant
    const conversations = await Conversation.find({
      participants: userId
    })
    .populate({
      path: 'participants',
      select: 'name email role profilePicture'
    })
    .sort({ lastMessageTimestamp: -1 }); // Most recent conversations first

    // Format the response and decrypt last message
    const formattedConversations = conversations.map(conv => {
      // Filter out the current user from participants
      const otherParticipant = conv.participants.find(p => p._id.toString() !== userId.toString());
      
      return {
        id: conv._id,
        participant: otherParticipant,
        lastMessage: conv.lastMessage ? decrypt(conv.lastMessage) : '',
        lastMessageTimestamp: conv.lastMessageTimestamp,
        unreadCount: conv.unreadCount && conv.unreadCount.get ? 
                    (conv.unreadCount.get(userId.toString()) || 0) : 0
      };
    });

    res.status(200).json(formattedConversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ message: 'Error retrieving conversations' });
  }
};

// Get messages for a specific conversation
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({ message: 'You do not have access to this conversation' });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name email role')
      .sort({ createdAt: 1 });

    // Decrypt message content before sending
    const decryptedMessages = messages.map(msg => {
      const decrypted = decrypt(msg.content);
      return {
        ...msg.toObject(),
        content: decrypted || msg.content // Fallback to original content if decryption fails
      };
    });

    // Mark messages as read
    await Message.updateMany(
      { 
        conversation: conversationId,
        recipient: userId,
        read: false
      },
      { read: true }
    );

    const unreadCountMap = new Map(conversation.unreadCount);
    unreadCountMap.set(userId.toString(), 0);
    await Conversation.updateOne(
      { _id: conversationId },
      { unreadCount: unreadCountMap }
    );

    res.status(200).json(decryptedMessages);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ message: 'Error retrieving messages' });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { recipientId, content } = req.body;
    const senderId = req.user.id; // Changed from req.user._id to req.user.id

    if (!recipientId || !content) {
      return res.status(400).json({ message: 'Recipient and message content are required' });
    }

    // Check if recipient exists
    const recipientExists = await User.exists({ _id: recipientId });
    if (!recipientExists) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Encrypt the message content
    const encryptedContent = encrypt(content);

    // Find existing conversation or create new one
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] }
    }).session(session);

    if (!conversation) {
      conversation = await Conversation.create([{
        participants: [senderId, recipientId],
        lastMessage: encryptedContent,
        lastMessageTimestamp: new Date(),
        unreadCount: new Map([[recipientId.toString(), 1]])
      }], { session });
      conversation = conversation[0];
    } else {
      // Update conversation with new message info
      const unreadCountMap = new Map(conversation.unreadCount);
      const currentUnreadCount = unreadCountMap.get(recipientId.toString()) || 0;
      unreadCountMap.set(recipientId.toString(), currentUnreadCount + 1);
      
      await Conversation.updateOne(
        { _id: conversation._id },
        { 
          lastMessage: encryptedContent,
          lastMessageTimestamp: new Date(),
          unreadCount: unreadCountMap
        }
      ).session(session);
    }

    // Create and save the new message with encrypted content
    const newMessage = await Message.create([{
      sender: senderId,
      recipient: recipientId,
      content: encryptedContent,
      conversation: conversation._id,
      read: false
    }], { session });

    await session.commitTransaction();
    
    const populatedMessage = await Message.findById(newMessage[0]._id)
      .populate('sender', 'name email role');

    // Decrypt the message content before sending the response
    const messageResponse = {
      ...populatedMessage.toObject(),
      content: content // Send back the original unencrypted content
    };

    res.status(201).json(messageResponse);
  } catch (error) {
    await session.abortTransaction();
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  } finally {
    session.endSession();
  }
};

// Get conversation with a specific user (or create if doesn't exist)
exports.getOrCreateConversation = async (req, res) => {
  try {

    console.log("inside the getOrCreateConversation chat controller function", req.params.userId);
    const { userId } = req.params;
    const currentUserId = req.user.id; // Changed from req.user._id to req.user.id
    console.log("currentUserId", currentUserId);
    console.log("userId", userId);

    if (userId === currentUserId.toString()) {
      return res.status(400).json({ message: 'Cannot create conversation with yourself' });
    }

    // Check if the other user exists
    const userExists = await User.exists({ _id: userId });
    console.log("userExists", userExists);
    if (!userExists) {
      return res.status(404).json({ message: 'User not found' });
    }
    

    // Find existing conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, userId] }
    })
    .populate({
      path: 'participants',
      select: 'name email role profilePicture'
    });

    // If no conversation exists, create one
    if (!conversation) {
      // Initialize unreadCount Map with both participants and zero counts
      const unreadCountMap = new Map();
      unreadCountMap.set(currentUserId.toString(), 0);
      unreadCountMap.set(userId.toString(), 0);
      
      conversation = await Conversation.create({
        participants: [currentUserId, userId],
        lastMessage: '',
        lastMessageTimestamp: new Date(),
        unreadCount: unreadCountMap
      });
      
      conversation = await Conversation.findById(conversation._id)
        .populate({
          path: 'participants',
          select: 'name email role profilePicture'
        });
    }

    // Format response
    const otherParticipant = conversation.participants.find(
      p => p._id.toString() !== currentUserId.toString()
    );

    const formattedConversation = {
      id: conversation._id,
      participant: otherParticipant,
      lastMessage: conversation.lastMessage,
      lastMessageTimestamp: conversation.lastMessageTimestamp,
      unreadCount: conversation.unreadCount && conversation.unreadCount.get ? 
                  (conversation.unreadCount.get(currentUserId.toString()) || 0) : 0
    };

    res.status(200).json(formattedConversation);
  } catch (error) {
    console.error('Error getting/creating conversation:', error);
    res.status(500).json({ message: 'Error processing conversation request' });
  }
};

// Mark messages in a conversation as read
exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id; // Changed from req.user._id to req.user.id

    // Verify the conversation exists and user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({ message: 'You do not have access to this conversation' });
    }

    // Mark all messages to this user in this conversation as read
    await Message.updateMany(
      { 
        conversation: conversationId,
        recipient: userId,
        read: false
      },
      { read: true }
    );

    // Reset unread count for this user in this conversation
    const unreadCountMap = new Map(conversation.unreadCount);
    unreadCountMap.set(userId.toString(), 0);
    await Conversation.updateOne(
      { _id: conversationId },
      { unreadCount: unreadCountMap }
    );

    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Error updating messages' });
  }
};

// Search for users to start a conversation
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user.id; // Changed from req.user._id to req.user.id
    const currentUserRole = req.user.role;
    
    let roleFilter = {};
    
    // If patient, can only chat with doctors
    if (currentUserRole === 'patient') {
      roleFilter = { role: 'doctor' };
    }
    // If doctor, can only chat with patients
    else if (currentUserRole === 'doctor') {
      roleFilter = { role: 'patient' };
    }
    
    // Search for users based on name or email
    const users = await User.find({
      _id: { $ne: currentUserId }, // Exclude current user
      ...roleFilter,
      $or: [
        { name: { $regex: query, $options: 'i' } }, // Case insensitive search
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('name email role profilePicture').limit(10);

    res.status(200).json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Error searching for users' });
  }
};