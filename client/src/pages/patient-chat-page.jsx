import React, { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { 
  getConversations, 
  getMessages, 
  sendMessage as apiSendMessage,
  markMessagesAsRead,
  getOrCreateConversation
} from '../services/chatService';
import { getAllDoctors } from '../services/doctorService'; // Import named export instead of default export
import { formatDistanceToNow } from 'date-fns';

export default function PatientChatPage() {
  const { currentUser:user } = useAuthContext();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDoctorList, setShowDoctorList] = useState(false); // Renamed from showSearch
  const [allDoctors, setAllDoctors] = useState([]); // State for all doctors
  const [loadingDoctors, setLoadingDoctors] = useState(false); // State for loading doctors
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
    console.log('[PatientChatPage] Fetching messages for conversation:', conversationId);
    console.log('[PatientChatPage] Current user:', user);
    
    try {
      const data = await getMessages(conversationId);
      console.log('[PatientChatPage] Raw messages data received:', data);


      
      // DEBUG: Log each message's sender details
      if (data && data.length > 0) {
        data.forEach((msg, index) => {
          console.log(`[PatientChatPage] Message ${index}:`, {
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
        // Convert IDs to strings for reliable comparison
        const senderId = msg.sender._id ? String(msg.sender._id) : '';
        const currentUserId = user?.id ? String(user?.id) : '';
        
        // Message is from patient if the current user is the sender
        const isPatient = senderId === currentUserId;
        
        console.log('[PatientChatPage] Message classification:', {
          isPatient,
          senderId,
          currentUserId,
          content: msg.content.substring(0, 20) + (msg.content.length > 20 ? '...' : '')
        });
        
        return {
          id: msg._id,
          sender: isPatient ? 'patient' : 'doctor',
          text: msg.content,
          timestamp: formatMessageTime(msg.createdAt),
          read: msg.read
        };
      });
      
      console.log('[PatientChatPage] Formatted messages:', formattedMessages);
      setMessages(formattedMessages);
    } catch (error) {
      console.error('[PatientChatPage] Error fetching messages:', error);
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
      sender: 'patient',
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
            sender: 'patient',
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
        console.log('[PatientChatPage] handleStartNewConversation called with userId:', userId);
      // Create or get conversation with the selected user
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
      
      // Hide doctor list
      setShowDoctorList(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  // Fetch all doctors when 'New Chat' is clicked
  const handleShowDoctorList = async () => {
    console.log('[PatientChatPage] handleShowDoctorList called, current state:', showDoctorList);
    
    if (!showDoctorList) {
      setLoadingDoctors(true);
      console.log('[PatientChatPage] Loading doctors...');
      
      try {
        console.log('[PatientChatPage] Calling AuthService.getAllDoctors()');
        const doctors = await getAllDoctors();
        console.log('[PatientChatPage] Doctors received:', doctors);
        
        // Check if doctors is defined and is an array
        if (Array.isArray(doctors)) {
          setAllDoctors(doctors);
          console.log('[PatientChatPage] Doctors state updated with', doctors.length, 'doctors');
        } else {
          console.error('[PatientChatPage] Response is not an array:', doctors);
          setAllDoctors([]);
        }
      } catch (error) {
        console.error('[PatientChatPage] Error fetching doctors:', error);
        setAllDoctors([]);
      } finally {
        setLoadingDoctors(false);
        console.log('[PatientChatPage] Loading doctors completed');
      }
    }
    
    setShowDoctorList(!showDoctorList);
    console.log('[PatientChatPage] Updated showDoctorList to:', !showDoctorList);
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
          <h1 className="text-xl font-semibold text-gray-800">Patient Chat</h1>
          <p className="text-sm text-gray-500">Connect with your healthcare providers</p>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Conversations sidebar */}
          <div className="w-1/3 border-r overflow-y-auto">
            <div className="p-3 border-b">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Conversations</h3>
                <button
                  onClick={handleShowDoctorList} // Use new handler
                  className="text-blue-500 hover:text-blue-700 text-xs"
                >
                  {showDoctorList ? 'Hide Doctors' : 'New Chat'}
                </button>
              </div>
              
              {console.log('[PatientChatPage] Rendering - showDoctorList:', showDoctorList, 
                           'loadingDoctors:', loadingDoctors, 
                           'allDoctors:', allDoctors, 
                           'allDoctors is array:', Array.isArray(allDoctors), 
                           'allDoctors length:', allDoctors?.length)}
                           
              {showDoctorList ? (
                <div className="mt-2 border rounded-md">
                  {loadingDoctors ? (
                    <div className="p-2 text-center">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="ml-2 text-xs text-gray-500">Loading Doctors...</span>
                    </div>
                  ) : !Array.isArray(allDoctors) ? (
                    <div className="p-2 text-xs text-gray-500 text-center">
                      Error loading doctors. Please try again.
                    </div>
                  ) : allDoctors.length === 0 ? (
                    <div className="p-2 text-xs text-gray-500 text-center">
                      No doctors available
                    </div>
                  ) : (
                    <div>
                      {console.log('[PatientChatPage] Rendering doctor list with', allDoctors.length, 'doctors')}
                      {allDoctors.map(doctor => (
                        <div 
                          key={doctor._id}
                          className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                          onClick={() => handleStartNewConversation(doctor._id)}
                        >
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                            <span className="text-xs font-medium text-blue-800">
                              {getAvatarText(doctor.name)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{doctor.name}</p>
                            {/* Optionally display role or specialty if available */}
                          </div>
                        </div>
                      ))}
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
                  onClick={() => setShowDoctorList(true)}
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
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="font-medium text-blue-800">{conv.avatar}</span>
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
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="font-medium text-blue-800">{selectedConversation.avatar}</span>
                  </div>
                  <div>
                    <h3 className="font-medium">{selectedConversation.name}</h3>
                    <p className="text-xs text-gray-500">Doctor</p>
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
                        const isCurrentUser = msg.sender === 'patient';
                        
                        return (
                          <div
                            key={msg.id}
                            className={`mb-4 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs md:max-w-md rounded-2xl p-3 ${
                                isCurrentUser
                                  ? (msg.pending 
                                    ? 'bg-blue-300 text-white'
                                    : msg.failed 
                                      ? 'bg-red-500 text-white' 
                                      : 'bg-blue-500 text-white')
                                  : 'bg-white border'
                              }`}
                            >
                              <p className="text-sm">{msg.text}</p>
                              <div className="flex items-center justify-end mt-1">
                                <p className={`text-xs ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
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

// Import for the icon
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