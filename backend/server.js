const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const port = 5000;

// Middleware to parse JSON bodies
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect('mongodb://127.0.0.1:27017/threadwire', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('Error connecting to MongoDB:', error));

// Import and use routes
const partsRoutes = require('./routes/parts');
const salesOrdersRoutes = require('./routes/salesorders');
const customersRoutes = require('./routes/customers');
const usersRoutes = require('./routes/users');
const blockersRoutes = require('./routes/blockers');
const actionsRoutes = require('./routes/actions');
const workorderRoutes = require('./routes/workorders');
const partbopRoutes = require('./routes/partbop');
const workorderexecutionRoutes = require('./routes/workorderexecution');
const graphRoutes = require('./routes/partgraph');

app.use('/parts', partsRoutes);
app.use('/salesorders', salesOrdersRoutes);
app.use('/customers', customersRoutes);
app.use('/users', usersRoutes);
app.use('/blockers', blockersRoutes);
app.use('/action-items', actionsRoutes);
app.use('/workorders', workorderRoutes);
app.use('/partbop', partbopRoutes);
app.use('/workorderexecution', workorderexecutionRoutes);
app.use('/partgraph', graphRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://127.0.0.1:${port}`);
});

