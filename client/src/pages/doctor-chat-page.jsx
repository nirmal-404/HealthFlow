import React, { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { 
  getConversations, 
  getMessages, 
  sendMessage as apiSendMessage,
  searchUsers,
  markMessagesAsRead,
  getOrCreateConversation
} from '../services/chatService';
import { formatDistanceToNow } from 'date-fns';

// Reusable MessageSquare icon component
function MessageSquare({ className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <path d="M3 9h18"></path>
      <path d="M9 21V9"></path>
    </svg>
  );
}

export default function DoctorChatPage() {
  const { currentUser: user } = useAuthContext();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [conversationSearchQuery, setConversationSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  // Fetch conversations on component mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      
      // Mark messages as read when conversation is selected
      markMessagesAsRead(selectedConversation.id).catch(err => 
        console.error('Error marking messages as read:', err)
      );
    }
  }, [selectedConversation]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Debounced search function
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      // Search for patients (backend handles role filtering)
      searchUsers(searchQuery)
        .then(results => {
          setSearchResults(results);
          setIsSearching(false);
        })
        .catch(error => {
          console.error('Error searching patients:', error);
          setIsSearching(false);
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!conversationSearchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }
    
    const filtered = conversations.filter(conv => 
      conv.name.toLowerCase().includes(conversationSearchQuery.toLowerCase()) ||
      (conv.lastMessage && conv.lastMessage.toLowerCase().includes(conversationSearchQuery.toLowerCase()))
    );
    setFilteredConversations(filtered);
  }, [conversationSearchQuery, conversations]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const data = await getConversations();
      
      // Format the conversations data for rendering
      const formattedConversations = data.map(conv => ({
        id: conv.id,
        avatar: getAvatarText(conv.participant.name),
        name: conv.participant.name,
        unread: conv.unreadCount,
        lastMessage: conv.lastMessage,
        timestamp: formatTimestamp(conv.lastMessageTimestamp),
        participantId: conv.participant._id
      }));
      
      setConversations(formattedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    setLoading(true);
    console.log('[DoctorChatPage] Fetching messages for conversation:', conversationId);
    console.log('[DoctorChatPage] Current user:', user?.id);
    
    try {
      const data = await getMessages(conversationId);
      console.log('[DoctorChatPage] Raw messages data received:', data);
      
      // DEBUG: Log each message's sender details
      if (data && data.length > 0) {
        data.forEach((msg, index) => {
          console.log(`[DoctorChatPage] Message ${index}:`, {
            msgId: msg._id,
            content: msg.content.substring(0, 20) + (msg.content.length > 20 ? '...' : ''),
            senderId: msg.sender._id,
            senderIdType: typeof msg.sender._id,
            senderIdString: String(msg.sender._id),
            senderRole: msg.sender.role,
            currentUserId: user?.id,
            currentUserIdType: typeof user?.id,
            currentUserIdString: String(user?.id),
            isEqual: String(msg.sender._id) === String(user?.id),
            isEqualDirect: msg.sender._id === user?.id
          });
        });
      }
      
      // Format the messages data for rendering
      const formattedMessages = data.map(msg => {

        console.log("trying to get the user id",user?.id)
        // Convert IDs to strings for reliable comparison
        const senderId = msg.sender._id ? String(msg.sender._id) : '';
        const currentUserId = user?.id ? String(user?.id) : '';
        
        console.log("currentUserId used for msg classification:", currentUserId);
        // Message is from doctor if the current user is the sender
        const isDoctor = senderId === currentUserId;
        
        console.log('[DoctorChatPage] Message classification:', {
          isDoctor,
          senderId,
          currentUserId,
          content: msg.content.substring(0, 20) + (msg.content.length > 20 ? '...' : '')
        });
        
        return {
          id: msg._id,
          sender: isDoctor ? 'doctor' : 'patient',
          text: msg.content,
          timestamp: formatMessageTime(msg.createdAt),
          read: msg.read
        };
      });
      
      console.log('[DoctorChatPage] Formatted messages:', formattedMessages);
      setMessages(formattedMessages);
    } catch (error) {
      console.error('[DoctorChatPage] Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    
    const messageText = newMessage;
    setNewMessage(''); // Clear input immediately
    
    // Add message to UI immediately for better UX
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      sender: 'doctor',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pending: true
    };
    
    setMessages(prevMessages => [...prevMessages, optimisticMessage]);
    
    // Send the message to the backend
    try {
      const sentMessage = await apiSendMessage(
        selectedConversation.participantId,
        messageText
      );
      
      // Replace the optimistic message with the actual one from the server
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === optimisticMessage.id ? {
            id: sentMessage._id,
            sender: 'doctor',
            text: sentMessage.content,
            timestamp: formatMessageTime(sentMessage.createdAt),
            read: false,
            pending: false
          } : msg
        )
      );
      
      // Update only the current conversation in the list
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === selectedConversation.id 
            ? {
                ...conv,
                lastMessage: messageText,
                timestamp: formatTimestamp(new Date())
              }
            : conv
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark the message as failed
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === optimisticMessage.id ? { ...msg, failed: true, pending: false } : msg
        )
      );
    }
  };

  const handleStartNewConversation = async (userId) => {
    try {
      // Create or get conversation with the selected patient
      const conversation = await getOrCreateConversation(userId);
      
      // Format the conversation
      const formattedConversation = {
        id: conversation.id,
        avatar: getAvatarText(conversation.participant.name),
        name: conversation.participant.name,
        unread: conversation.unreadCount,
        lastMessage: conversation.lastMessage,
        timestamp: formatTimestamp(conversation.lastMessageTimestamp),
        participantId: conversation.participant._id
      };
      
      // Add to conversations list if not already there
      setConversations(prevConversations => {
        if (!prevConversations.some(conv => conv.id === conversation.id)) {
          return [formattedConversation, ...prevConversations];
        }
        return prevConversations;
      });
      
      // Select the conversation
      setSelectedConversation(formattedConversation);
      
      // Clear search
      setSearchQuery('');
      setShowSearch(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  // Helper functions
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatarText = (name) => {
    if (!name) return '';
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-3 border-b">
          <h1 className="text-xl font-semibold text-gray-800">Doctor Chat</h1>
          <p className="text-sm text-gray-500">Connect with your patients</p>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Conversations sidebar */}
          <div className="w-1/3 border-r overflow-y-auto">
            <div className="p-3 border-b">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Conversations</h3>
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="text-blue-500 hover:text-blue-700 text-xs"
                >
                  {showSearch ? 'Hide Search' : 'New Chat'}
                </button>
              </div>
              
              {showSearch ? (
                <div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for patients..."
                    className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {searchQuery && (
                    <div className="mt-2 border rounded-md">
                      {isSearching ? (
                        <div className="p-2 text-center">
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          <span className="ml-2 text-xs text-gray-500">Searching...</span>
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-2 text-xs text-gray-500 text-center">
                          No patients found
                        </div>
                      ) : (
                        <div>
                          {searchResults.map(user => (
                            <div 
                              key={user._id}
                              className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                              onClick={() => handleStartNewConversation(user._id)}
                            >
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
                                <span className="text-xs font-medium text-green-800">
                                  {getAvatarText(user.name)}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.role}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={conversationSearchQuery}
                  onChange={(e) => setConversationSearchQuery(e.target.value)}
                />
              )}
            </div>
            
            {loading && conversations.length === 0 ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                <MessageSquare className="h-8 w-8 mb-2" />
                <p className="text-sm">No conversations yet</p>
                <button
                  onClick={() => setShowSearch(true)}
                  className="mt-2 text-blue-500 text-sm hover:underline"
                >
                  Start a new conversation
                </button>
              </div>
            ) : (
              <div>
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 flex items-center hover:bg-gray-100 cursor-pointer ${
                      selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <span className="font-medium text-green-800">{conv.avatar}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h3 className="font-medium text-sm">{conv.name}</h3>
                        <span className="text-xs text-gray-500">{conv.timestamp}</span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{conv.lastMessage || "No messages yet"}</p>
                    </div>
                    {conv.unread > 0 && (
                      <div className="ml-2 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        {conv.unread}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat header */}
                <div className="p-3 border-b flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="font-medium text-green-800">{selectedConversation.avatar}</span>
                  </div>
                  <div>
                    <h3 className="font-medium">{selectedConversation.name}</h3>
                    <p className="text-xs text-gray-500">Patient</p>
                  </div>
                </div>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                  {loading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <MessageSquare className="h-12 w-12 mb-2" />
                      <p className="text-base">No messages yet</p>
                      <p className="text-sm mt-1">Start the conversation by sending a message</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg) => {
                        // Explicitly determine if this message is from the current user
                        const isCurrentUser = msg.sender === 'doctor';
                        
                        return (
                          <div
                            key={msg.id}
                            className={`mb-4 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs md:max-w-md rounded-2xl p-3 ${
                                isCurrentUser
                                  ? (msg.pending 
                                    ? 'bg-green-300 text-white'
                                    : msg.failed 
                                      ? 'bg-red-500 text-white' 
                                      : 'bg-green-500 text-white')
                                  : 'bg-white border'
                              }`}
                            >
                              <p className="text-sm">{msg.text}</p>
                              <div className="flex items-center justify-end mt-1">
                                <p className={`text-xs ${isCurrentUser ? 'text-green-100' : 'text-gray-500'}`}>
                                  {msg.timestamp}
                                </p>
                                {msg.pending && (
                                  <span className="ml-2 text-xs">
                                    Sending...
                                  </span>
                                )}
                                {msg.failed && (
                                  <span className="ml-2 text-xs">
                                    Failed to send
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
                
                {/* Message input */}
                <div className="p-3 border-t">
                  <form onSubmit={handleSendMessage} className="flex">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className={`px-4 rounded-r-md ${
                        newMessage.trim()
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Send
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="flex justify-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mb-2" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700">No conversation selected</h3>
                  <p className="text-gray-500 max-w-md mt-1">
                    Select a conversation from the list or start a new one by clicking "New Chat"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}