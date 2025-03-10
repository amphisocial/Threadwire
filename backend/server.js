require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const cors = require('cors');

const app = express();
const port = 5000;

app.use(cors());
// Middleware to parse JSON bodies
app.use(express.json());

// Connect to MongoDB
// mongoose
//   .connect('mongodb://127.0.0.1:27017/threadwire', { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log('Connected to MongoDB'))
//   .catch((error) => console.error('Error connecting to MongoDB:', error));

// Import and use routes
const partsRoutes = require('./routes/parts');
const salesOrdersRoutes = require('./routes/salesorders');
const customersRoutes = require('./routes/customers');
const blockersRoutes = require('./routes/blockers');
const actionsRoutes = require('./routes/actions');
const workorderRoutes = require('./routes/workorders');
const partbopRoutes = require('./routes/partbop');
const workorderexecutionRoutes = require('./routes/workorderexecution');
const graphRoutes = require('./routes/partgraph');
const vectorService = require('./services/vectorService');
const chatbotRoutes = require('./routes/chatbot');

app.use('/parts', partsRoutes);
app.use('/salesorders', salesOrdersRoutes);
app.use('/customers', customersRoutes);
app.use('/blockers', blockersRoutes);
app.use('/action-items', actionsRoutes);
app.use('/workorders', workorderRoutes);
app.use('/partbop', partbopRoutes);
app.use('/workorderexecution', workorderexecutionRoutes);
app.use('/partgraph', graphRoutes);

// Start the server
// app.listen(port, () => {
//   console.log(`Server running on http://127.0.0.1:${port}`);
// });

app.use('/user', userRoutes);
app.use('/auth', authRoutes);
app.use('/chatbot', chatbotRoutes);

mongoose.connect('mongodb://127.0.0.1:27017/threadwire', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(5000, () => console.log('Server running on port 5000'));
  })
  .catch(error => console.log(error));

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async function () {
  console.log('Connected to MongoDB');

  // Initialize vector service with Pinecone
  try {
    await vectorService.initialize();
    console.log('Vector service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize vector service:', error);
  }
});

