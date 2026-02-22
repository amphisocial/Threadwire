/**
 * =============================================================================
 * ThreadWire Backend Server
 * =============================================================================
 * Main entry point for the ThreadWire Express.js backend application.
 * 
 * This server provides REST API endpoints for:
 * - User authentication and management
 * - Parts, Sales Orders, Work Orders management
 * - Blockers and Action Items tracking
 * - AI-powered chatbot with vector search (Pinecone)
 * - Calendar view for order scheduling
 * - API token management and analytics
 * 
 * Database: MongoDB with replica set for change streams
 * Port: 5000
 * 
 * Last Updated: January 12, 2026
 * =============================================================================
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const cors = require('cors');
const changeStreamService = require('./services/changeStreamService');

const app = express();
const port = 5000;

/**
 * CORS Middleware
 * Enables Cross-Origin Resource Sharing for frontend communication
 */
app.use(cors());

/**
 * JSON Body Parser Middleware
 * Parses incoming JSON request bodies and makes them available in req.body
 */
app.use(express.json());

/**
 * =============================================================================
 * Route Imports
 * =============================================================================
 * All route modules are imported here and registered below.
 * Each route handles a specific domain/entity in the application.
 */

// Core entity routes
const partsRoutes = require('./routes/parts');               // Parts inventory management
const salesOrdersRoutes = require('./routes/salesorders');   // Sales order management
const customersRoutes = require('./routes/customers');       // Customer/Company management
const blockersRoutes = require('./routes/blockers');         // Blocker tracking for orders
const actionsRoutes = require('./routes/actions');           // Action items management
const workorderRoutes = require('./routes/workorders');      // Work order management
const partbopRoutes = require('./routes/partbop');           // Part Bill of Process
const workorderexecutionRoutes = require('./routes/workorderexecution'); // Work order execution tracking

// Visualization and AI routes
const graphRoutes = require('./routes/partgraph');           // Graph visualization for parts/orders
const vectorService = require('./services/vectorService');   // Pinecone vector search service
const chatbotRoutes = require('./routes/chatbot');           // AI chatbot endpoints
const chatSessionRoutes = require('./routes/chatSessionRoutes'); // Chat session management

// API management routes
const apiTokenRoutes = require('./routes/apiTokenRoutes');   // API token CRUD operations
const apiAnalyticsRoutes = require('./routes/apiAnalyticsRoutes'); // API usage analytics

// Calendar route (Added: Jan 12, 2026)
const calendarRoutes = require('./routes/calendar');         // Calendar week view for orders

/**
 * =============================================================================
 * Route Registration
 * =============================================================================
 * All routes are mounted here with their base paths.
 * Example: app.use('/parts', partsRoutes) means all routes in partsRoutes
 *          will be prefixed with /parts (e.g., GET /parts, POST /parts, etc.)
 */

// Core entity endpoints
app.use('/parts', partsRoutes);
app.use('/salesorders', salesOrdersRoutes);
app.use('/customers', customersRoutes);
app.use('/blockers', blockersRoutes);
app.use('/action-items', actionsRoutes);
app.use('/workorders', workorderRoutes);
app.use('/partbop', partbopRoutes);
app.use('/workorderexecution', workorderexecutionRoutes);

// Visualization and AI endpoints
app.use('/partgraph', graphRoutes);
app.use('/chatbot', chatbotRoutes);
app.use('/chatsession', chatSessionRoutes);

// User and authentication endpoints
app.use('/user', userRoutes);
app.use('/auth', authRoutes);

// API management endpoints
app.use('/tokens', apiTokenRoutes);
app.use('/analytics', apiAnalyticsRoutes);

// Calendar endpoint (Added: Jan 12, 2026)
app.use('/calendar', calendarRoutes);

/**
 * =============================================================================
 * MongoDB Connection
 * =============================================================================
 * Connects to MongoDB with replica set enabled (required for change streams).
 * Once connected, starts the Express server on port 5000.
 */
mongoose.connect('mongodb://127.0.0.1:27017/threadwire?replicaSet=rs0', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(5000, () => console.log('Server running on port 5000'));
  })
  .catch(error => console.log(error));

/**
 * =============================================================================
 * Database Event Handlers & Service Initialization
 * =============================================================================
 * Once the database connection is open:
 * 1. Initialize the vector service (Pinecone) for AI-powered semantic search
 * 2. Initialize the change stream service to watch for database changes
 */
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async function () {
  console.log('Connected to MongoDB');
  
  try {
    // Initialize Pinecone vector service for RAG-based chatbot
    await vectorService.initialize();
    console.log('Vector service initialized successfully');
    
    // Initialize change stream service to sync data changes in real-time
    await changeStreamService.initialize(mongoose.connection.db);
    console.log('Change stream service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize vector service:', error);
  }
});
