// scripts/migrateSalesOrders.js
require('dotenv').config();
const mongoose = require('mongoose');
const SalesOrder = require('../models/SalesOrder');
const vectorService = require('../services/vectorService');


async function migrateSalesOrders() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://127.0.0.1:27017/threadwire', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Initialize vector service
    console.log('Initializing vector service...');
    await vectorService.initialize();
    console.log('Vector service initialized');
    
    // Get 10 sales orders
    const salesOrders = await SalesOrder.find().limit(10);
    
    if (salesOrders.length === 0) {
      console.log('No sales orders found in the database.');
      return;
    }
    
    console.log(`Found ${salesOrders.length} sales orders to process`);
    
    // Process each sales order with delay between requests
    let successCount = 0;
    
    for (const [index, order] of salesOrders.entries()) {
      try {
        console.log(`Processing sales order ${index + 1}/${salesOrders.length}: ${order._id}`);
        await vectorService.processDocument(order.toObject(), 'salesOrders');
        successCount++;
        
        // Add delay between API calls to avoid rate limiting (1 second)
        if (index < salesOrders.length - 1) {
          console.log('Waiting 1 second before next request...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error processing sales order ${order._id}:`, error);
      }
    }
    
    console.log(`Successfully processed ${successCount}/${salesOrders.length} sales orders`);
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Close mongoose connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
}

// Run the migration
console.log('Starting sales order migration...');
migrateSalesOrders().catch(error => {
  console.error('Unhandled error in migration process:', error);
  process.exit(1);
});
