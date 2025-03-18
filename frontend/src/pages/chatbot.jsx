// src/components/Chatbot.js
import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../comps/NavBar';
import './chatbot.css';

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({});
    const [documentTypes, setDocumentTypes] = useState([]);
    const [selectedDocTypes, setSelectedDocTypes] = useState([]);
    const [availableFilters, setAvailableFilters] = useState({});
    const [sessionId, setSessionId] = useState(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const messagesEndRef = useRef(null);
    const [showFilters, setShowFilters] = useState(false);
    const [typingText, setTypingText] = useState('');
    const [fullResponse, setFullResponse] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Get authentication headers
    const getAuthHeaders = () => {
        const token = localStorage.getItem('authToken');
        const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(isGoogleAuth && { 'Auth-Type': 'google' }),
        };
    };
    
    useEffect(() => {
      document.title = 'Home';
    }, []);
    
    // Fetch chat history on component mount
    useEffect(() => {
        const fetchChatHistory = async () => {
            try {
                setIsLoadingHistory(true);
                const response = await fetch('/api/chatsession/history', {
                    headers: getAuthHeaders(),
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.messages && data.messages.length > 0) {
                        // Convert ISO strings back to Date objects
                        const messagesWithDates = data.messages.map(msg => ({
                            ...msg,
                            timestamp: new Date(msg.timestamp)
                        }));
                        
                        setMessages(messagesWithDates);
                        setSessionId(data.sessionId);
                    } else {
                        if (data.sessionId) {
                            setSessionId(data.sessionId);
                        }
                    }
                }
            } catch (error) {
                // Error handling
            } finally {
                setIsLoadingHistory(false);
            }
        };

        fetchChatHistory();
    }, []);

    // Fetch available filters and document types on component mount
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await fetch('/api/chatbot/metadata', {
                    headers: getAuthHeaders(),
                });

                if (response.ok) {
                    const data = await response.json();
                    setAvailableFilters(data.filters || {});
                    setDocumentTypes(data.documentTypes || []);
                    // By default, select all document types
                    setSelectedDocTypes(data.documentTypes.map(docType => docType.id));
                }
            } catch (error) {
                // Error handling
            }
        };

        fetchMetadata();
    }, []);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingText]);
    
    // Handle the word-by-word typing effect
    useEffect(() => {
        if (!isTyping || !fullResponse) return;
        
        const words = fullResponse.split(' ');
        let currentWordIndex = typingText.split(' ').length;
        
        // If we've typed all words, stop typing
        if (currentWordIndex >= words.length) {
            setIsTyping(false);
            return;
        }
        
        // Add the next word with appropriate spacing
        const nextWord = words[currentWordIndex];
        const shouldAddSpace = typingText.length > 0;
        
        const timer = setTimeout(() => {
            setTypingText(prev => 
                shouldAddSpace ? `${prev} ${nextWord}` : nextWord
            );
            
            // Update the last message with the current typing text
            setMessages(prev => {
                const updatedMessages = [...prev];
                const lastMessage = updatedMessages[updatedMessages.length - 1];
                
                if (lastMessage && lastMessage.type === 'bot') {
                    lastMessage.text = shouldAddSpace 
                        ? `${typingText} ${nextWord}` 
                        : nextWord;
                }
                
                return updatedMessages;
            });
        }, 100); // Adjust timing as needed for desired speed
        
        return () => clearTimeout(timer);
    }, [isTyping, fullResponse, typingText]);

    // Helper function to save message to server
    const saveMessageToHistory = async (message) => {
        try {
            const response = await fetch('/api/chatsession/message', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    message,
                    sessionId
                }),
            });

            if (response.ok) {
                const data = await response.json();
                
                // Only update session ID if we don't have one yet
                if (!sessionId && data.sessionId) {
                    setSessionId(data.sessionId);
                }
                
                return data.sessionId;
            }
            return null;
        } catch (error) {
            return null;
        }
    };

    // Handle sending messages
    const handleSendMessage = async () => {
        if (!input.trim()) return;

        // Add user message to chat
        const userMessage = {
            text: input,
            type: 'user',
            timestamp: new Date()
        };

        // Store the current input value to use in the API call
        const currentInput = input.trim();
        
        // Update UI immediately to show user's message
        setMessages(prev => [...prev, userMessage]);
        setInput(''); // Clear input field
        setIsLoading(true);
        
        // Save user message to history and get back session ID
        const savedSessionId = await saveMessageToHistory(userMessage);
        
        // Update session ID if needed and returned
        if (savedSessionId && !sessionId) {
            setSessionId(savedSessionId);
        }

        try {
            // Send chat query to backend
            const response = await fetch('/api/chatbot/chat', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    query: currentInput,
                    filters: filters,
                    documentTypes: selectedDocTypes.length > 0 ? selectedDocTypes : undefined
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response from server');
            }

            const data = await response.json();

            // Start the typing effect
            setFullResponse(data.answer);
            setTypingText('');
            setIsTyping(true);
            
            // Add an empty bot message that will be filled word by word
            const botMessage = {
                text: '',
                type: 'bot',
                timestamp: new Date(),
                id: Date.now() // Add a unique ID to track this message
            };

            setMessages(prev => [...prev, botMessage]);
            
            // Save the bot's response to history once typing is complete
            setTimeout(() => {
                const completedBotMessage = {
                    text: data.answer,
                    type: 'bot',
                    timestamp: new Date()
                };
                saveMessageToHistory(completedBotMessage);
            }, Math.min(data.answer.split(' ').length * 100 + 200, 2000)); // Cap at 2 seconds max

        } catch (error) {
            // Add error message
            const errorMessage = {
                text: 'Sorry, I encountered an error. Please try again later.',
                type: 'error',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, errorMessage]);
            
            // Save error message to history
            await saveMessageToHistory(errorMessage);
            
        } finally {
            setIsLoading(false);
        }
    };

    // Handle enter key press
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Handle clearing chat history
    const handleClearChat = async () => {
        try {
            const response = await fetch('/api/chatsession/clear', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ sessionId }),
            });

            if (response.ok) {
                setMessages([]);
                // Do NOT reset session ID - keep using the same session
            }
        } catch (error) {
            // Error handling
        }
    };

    // Handle filter changes
    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value || undefined
        }));
    };

    // Handle document type selection
    const handleDocTypeChange = (docType) => {
        setSelectedDocTypes(prev => {
            if (prev.includes(docType)) {
                return prev.filter(type => type !== docType);
            } else {
                return [...prev, docType];
            }
        });
    };

    // Toggle all document types
    const handleToggleAllDocTypes = () => {
        if (selectedDocTypes.length === documentTypes.length) {
            setSelectedDocTypes([]);
        } else {
            setSelectedDocTypes(documentTypes.map(doc => doc.id));
        }
    };

    return (
        <div className="app-container">
            <Navbar />
            <div className="chatbot-header">
                <div className="chatbot-title-row">
                    <h2>Enterprise Data Assistant</h2>
                    {messages.length > 0 && (
                        <button 
                            onClick={handleClearChat} 
                            className="clear-chat-button"
                            title="Clear chat history"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                            Clear Chat
                        </button>
                    )}
                </div>
            </div>

              
            <div className="chatbot-messages">
                {isLoadingHistory ? (
                    <div className="loading-history">
                        <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <p>Loading your chat history...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="welcome-message">
                        <h3>Hi. I am your Threadwire Assistant</h3>
                        <p>Ask me anything about your enterprise data</p>
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div
                            key={message._id || message.id || index}
                            className={`message ${message.type}`}
                        >
                            <div className="message-avatar">
                                {message.type === 'user' ? (
                                    <span className="user-avatar">You</span>
                                ) : message.type === 'error' ? (
                                    <span className="error-avatar">!</span>
                                ) : (
                                    <span className="bot-avatar">AI</span>
                                )}
                            </div>
                            <div className="message-bubble">
                                <div className="message-content">
                                    {message.text}
                                    {message.type === 'bot' && isTyping && index === messages.length - 1 && (
                                        <span className="typing-cursor"></span>
                                    )}
                                </div>
                                <div className="message-timestamp">
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {isLoading && (
                    <div className="message bot loading">
                        <div className="message-avatar">
                            <span className="bot-avatar">AI</span>
                        </div>
                        <div className="message-bubble">
                            <div className="message-content">
                                <div className="typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="chatbot-input">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                    placeholder="Type your question here..."
                    disabled={isLoading}
                />
                <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                    className="send-button"
                    aria-label="Send message"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default Chatbot;