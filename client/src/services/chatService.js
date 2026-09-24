import axios from 'axios';
import api from './api';

const CHAT_API = `${api.defaults.baseURL}/api/chat`;

// Get all conversations for the current user
export const getConversations = async () => {
  try {
    console.log('[ChatService] Getting all conversations');
    const response = await api.get(`/api/chat/conversations`);
    console.log('[ChatService] Conversations response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[ChatService] Error fetching conversations:', error);
    throw error;
  }
};

// Get messages for a specific conversation
export const getMessages = async (conversationId) => {
  try {
    console.log('[ChatService] Getting messages for conversation:', conversationId);
    const response = await api.get(`/api/chat/messages/${conversationId}`);
    
    // Messages are already decrypted by the backend
    return response.data;
  } catch (error) {
    console.error('[ChatService] Error fetching messages:', error);
    throw error;
  }
};

// Send a new message
export const sendMessage = async (recipientId, content) => {
  try {
    console.log('[ChatService] Sending message to recipient:', recipientId);
    const response = await api.post(`/api/chat/messages`, { recipientId, content });
    // Response includes the decrypted content
    return response.data;
  } catch (error) {
    console.error('[ChatService] Error sending message:', error);
    throw error;
  }
};

// Get or create a conversation with a specific user
export const getOrCreateConversation = async (userId) => {
  try {
    console.log('[ChatService] Getting/creating conversation with user:', userId);
    const response = await api.get(`/api/chat/conversation/${userId}`);
    // Last message is already decrypted by backend
    return response.data;
  } catch (error) {
    console.error('[ChatService] Error getting/creating conversation:', error);
    throw error;
  }
};

// Mark all messages in a conversation as read
export const markMessagesAsRead = async (conversationId) => {
  try {
    console.log('[ChatService] Marking messages as read for conversation:', conversationId);
    const response = await api.put(`/api/chat/messages/${conversationId}/read`);
    return response.data;
  } catch (error) {
    console.error('[ChatService] Error marking messages as read:', error);
    throw error;
  }
};

// Search for users to start a conversation with
export const searchUsers = async (query) => {
  try {
    console.log('[ChatService] Searching users with query:', query);
    const response = await api.get(`/api/chat/users/search`, { params: { query } });
    return response.data;
  } catch (error) {
    console.error('[ChatService] Error searching users:', error);
    throw error;
  }
};