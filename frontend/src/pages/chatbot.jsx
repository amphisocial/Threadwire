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
                console.error('Error fetching metadata:', error);
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

    // Handle sending messages
    const handleSendMessage = async () => {
        if (!input.trim()) return;

        // Add user message to chat
        const userMessage = {
            text: input,
            type: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Send chat query to backend
            const response = await fetch('/api/chatbot/chat', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    query: input,
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
        } catch (error) {
            console.error('Chat error:', error);

            // Add error message
            const errorMessage = {
                text: 'Sorry, I encountered an error. Please try again later.',
                type: 'error',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, errorMessage]);
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
                </div>
            </div>

              
            <div className="chatbot-messages">
                {messages.length === 0 ? (
                    <div className="welcome-message">
                        <h3>Hi. I am your Threadwire Assistant</h3>
                        <p>Ask me anything about your enterprise data</p>
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div
                            key={message.id || index}
                            className={`message ${message.type}`}
                        >
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
                    ))
                )}

                {isLoading && (
                    <div className="message bot loading">
                        <div className="message-content">
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
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
                    onKeyUp={handleKeyPress}
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
