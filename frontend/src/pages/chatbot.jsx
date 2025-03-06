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
    }, [messages]);

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

            // Add bot response to chat
            const botMessage = {
                text: data.answer,
                type: 'bot',
                timestamp: new Date()
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
        <div className="chatbot-container">
            <Navbar />
            <div className="chatbot-header">
                <div className="chatbot-title-row">
                    <h2>Manufacturing Data Assistant</h2>
                    <button
                        className={`filter-toggle ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <i className="fa fa-filter"></i> Filters
                    </button>
                </div>

                {showFilters && (
                    <div className="filter-panel">
                        <div className="document-type-filters">
                            <h4>Data Sources</h4>
                            <div className="doc-type-container">
                                <div className="doc-type-all">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={selectedDocTypes.length === documentTypes.length}
                                            onChange={handleToggleAllDocTypes}
                                        />
                                        All Data Types
                                    </label>
                                </div>
                                <div className="doc-types-grid">
                                    {documentTypes.map(docType => (
                                        <label key={docType.id} className="doc-type-item">
                                            <input
                                                type="checkbox"
                                                checked={selectedDocTypes.includes(docType.id)}
                                                onChange={() => handleDocTypeChange(docType.id)}
                                            />
                                            {docType.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {Object.entries(availableFilters).length > 0 && (
                            <div className="status-filters">
                                <h4>Filters</h4>
                                {Object.entries(availableFilters).map(([filterName, options]) => (
                                    <div className="filter-item" key={filterName}>
                                        <label htmlFor={`filter-${filterName}`}>{filterName}:</label>
                                        <select
                                            id={`filter-${filterName}`}
                                            value={filters[filterName] || ''}
                                            onChange={(e) => handleFilterChange(filterName, e.target.value)}
                                        >
                                            <option value="">Any</option>
                                            {options.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="chatbot-messages">
                {messages.length === 0 ? (
                    <div className="welcome-message">
                        <h3>Hi. I am your Threadwire Assistant</h3>
                        <p>Ask me anything about your manufacturing data. For example:</p>
                        <ul>
                            <li>What's the status of sales order SO12345?</li>
                            <li>Find all work orders for part P9876</li>
                            <li>What components are used in part ABC123?</li>
                            <li>Show me execution details for work order WO456</li>
                            <li>What's the current inventory of part XYZ?</li>
                        </ul>
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div
                            key={index}
                            className={`message ${message.type}`}
                        >
                            <div className="message-content">
                                {message.text}
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
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default Chatbot;