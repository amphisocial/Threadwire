// services/vectorService.js
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Pinecone } = require('@pinecone-database/pinecone');
const mongoose = require('mongoose');


class VectorService {
  constructor() {
    this.pinecone = null;
    this.index = null;
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: "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",
      modelName: "text-embedding-3-small"
    });
    this.isInitialized = false;
    
    // Define processing strategies for different document types
    this.processingStrategies = {
      salesOrders: this.processSalesOrder,
      parts: this.processPart,
      workorders: this.processWorkOrder,
      partbop: this.processPartBoP,
      workorderexecution: this.processWorkOrderExecution,
      blockers: this.processBlocker
    };
  }

  async initialize() {
    try {
      if (this.isInitialized) return true;
      
      // Initialize Pinecone client
      this.pinecone = new Pinecone({
        apiKey: "pcsk_2HyTbK_7TXhsttWXA9T1hP3E5u5jGA7PpxngFfMLAraYDX8HcpC3BVF8WZmvR1XGTrkbyR",
      });
      
      // Get the index
      this.index = this.pinecone.Index("threadwire-embeddings");
      
      console.log('Vector service initialized with Pinecone');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize vector service:', error);
      throw error;
    }
  }

  async processDocument(document, collectionName) {
    try {
      if (!this.isInitialized) {
        throw new Error('Vector service not initialized');
      }
      
      // Use the appropriate processing strategy based on collection type
      const processStrategy = this.processingStrategies[collectionName] || this.defaultProcessing;
      
      let result;
      if (processStrategy.constructor.name === 'AsyncFunction') {
        result = await processStrategy.call(this, document, collectionName);
      } else {
        result = processStrategy.call(this, document, collectionName);
      }
      
      const { text, metadata } = result;
      
      // Generate embedding
      const embedding = await this.embeddings.embedQuery(text);
      
      // Create a unique ID 
      const id = `${collectionName}_${document._id.toString()}`;
      
      // Store in Pinecone
      await this.index.upsert([{
          id,
          values: embedding,
          metadata: {
            ...metadata,
            pageContent: text,
            source: collectionName,
            docId: document._id.toString(),
            timestamp: new Date().toISOString()
          
        }
      }]);
      
      return true;
    } catch (error) {
      console.error('Error processing document for vector DB:', error);
      throw error;
    }
  }
  
  // Default processing strategy for any document type
  defaultProcessing(document, collectionName) {
    const fields = [];
    
    // Add all fields as key-value pairs for better searchability
    for (const [key, value] of Object.entries(document)) {
      if (key === '_id' || key === '__v' || value === undefined) continue;
      
      if (typeof value === 'string' || typeof value === 'number') {
        fields.push(`${key}: ${value}`);
      } else if (value instanceof Date) {
        fields.push(`${key}: ${value.toISOString().split('T')[0]}`);
      } else if (value && typeof value === 'object') {
        // For nested objects
        fields.push(`${key}: ${JSON.stringify(value)}`);
      }
    }
    
    return {
      text: fields.join(' ').trim(),
      metadata: {
        type: collectionName
      }
    };
  }

  async processBlocker(document, collectionName) {
    try {
      const fields = [];
      
      // Add basic blocker fields
      if (document.title) fields.push(`title: ${document.title}`);
      if (document.description) fields.push(`description: ${document.description}`);
      if (document.priority) fields.push(`priority: ${document.priority}`);
      if (document.type) fields.push(`type: ${document.type}`);
      if (document.status) fields.push(`status: ${document.status}`);
      
      let partNumbers = [];
    let workOrderNumbers = [];
    let salesOrderNumbers = [];
      // Handle related parts
      if (document.relatedParts && document.relatedParts.length > 0) {
        // Convert string IDs to ObjectId if needed
        try {
        const partIds = document.relatedParts.map(id => 
          typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
        );
        
        const relatedParts = await mongoose.connection.db.collection('parts').find({ 
          _id: { $in: partIds } 
        }).toArray();
        
        if (relatedParts.length > 0) {
          fields.push(`Related Parts:`);
          relatedParts.forEach(part => {
            fields.push(`  - Part Number: ${part.partnumber}, Revision: ${part.revision}, Description: ${part.description}`);
            partNumbers.push(part.partnumber);
          });
          
          // Add searchable part numbers section
          fields.push(`Related Part Numbers: ${partNumbers.join(', ')}`);
        } else {
          fields.push(`relatedParts: ${JSON.stringify(document.relatedParts)}`);
        }
      } catch (err) {
        console.error('Error fetching related parts:', err);
        fields.push(`relatedParts: ${JSON.stringify(document.relatedParts)}`);
      }
    }
      
      // Handle related work orders
      if (document.relatedWorkOrders && document.relatedWorkOrders.length > 0) {
        try {
          const workOrderIds = document.relatedWorkOrders.map(id => 
            typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
          );
          
          const relatedWorkOrders = await mongoose.connection.db.collection('workorders').find({ 
            _id: { $in: workOrderIds } 
          }).toArray();
          
          if (relatedWorkOrders.length > 0) {
            fields.push(`Related Work Orders:`);
            relatedWorkOrders.forEach(wo => {
              fields.push(`  - Work Order: ${wo.workorder}, Type: ${wo.type}, Description: ${wo.description}`);
              workOrderNumbers.push(wo.workorder);
            });
            fields.push(`Related Work Order Numbers: ${workOrderNumbers.join(', ')}`);
          } else {
            fields.push(`relatedWorkOrders: ${JSON.stringify(document.relatedWorkOrders)}`);
          }
        } catch (err) {
          console.error('Error fetching related work orders:', err);
          fields.push(`relatedWorkOrders: ${JSON.stringify(document.relatedWorkOrders)}`);
        }
      }
      
      // Handle related sales orders
      if (document.relatedSalesOrders && document.relatedSalesOrders.length > 0) {
        try {
          const salesOrderIds = document.relatedSalesOrders.map(id => 
            typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
          );
          
          const relatedSalesOrders = await mongoose.connection.db.collection('salesorders').find({ 
            _id: { $in: salesOrderIds } 
          }).toArray();
          
          if (relatedSalesOrders.length > 0) {
            fields.push(`Related Sales Orders:`);
            relatedSalesOrders.forEach(so => {
              fields.push(`  - Order Number: ${so.ordernumber}, Customer: ${so.customer_name}, Part Number: ${so.partnumber}`);
              salesOrderNumbers.push(so.ordernumber);
             });
            
            fields.push(`Related Sales Order Numbers: ${salesOrderNumbers.join(', ')}`);
          } else {
            fields.push(`relatedSalesOrders: ${JSON.stringify(document.relatedSalesOrders)}`);
          }
        } catch (err) {
          console.error('Error fetching related sales orders:', err);
          fields.push(`relatedSalesOrders: ${JSON.stringify(document.relatedSalesOrders)}`);
        }
      }
      
      // Add timestamps
      if (document.createdAt) fields.push(`createdAt: ${new Date(document.createdAt).toISOString().split('T')[0]}`);
      if (document.updatedAt) fields.push(`updatedAt: ${new Date(document.updatedAt).toISOString().split('T')[0]}`);
      
      return {
        text: fields.join(' ').trim(),
        metadata: {
          type: 'blockers',
          title: document.title,
          status: document.status,
          priority: document.priority,
          relatedPartIds: document.relatedParts,
        relatedPartNumbers: partNumbers,
        relatedWorkOrderIds: document.relatedWorkOrders,
        relatedWorkOrderNumbers: workOrderNumbers,
        relatedSalesOrderIds: document.relatedSalesOrders,
        relatedSalesOrderNumbers: salesOrderNumbers
        }
      };
    } catch (error) {
      console.error(`Error processing blocker document: ${error}`);
      // Fallback to basic processing if fetching related details fails
      return this.defaultProcessing(document, collectionName);
    }
  }
  
  // Sales Order specific processing
  processSalesOrder(document, collectionName) {
    const fields = [];
    
    // Process based on your SalesOrder schema
    if (document.ordernumber) fields.push(`Order Number: ${document.ordernumber}`);
    if (document.program) fields.push(`Program: ${document.program}`);
    if (document.partnumber) fields.push(`Part Number: ${document.partnumber}`);
    if (document.shipping_status) fields.push(`Shipping Status: ${document.shipping_status}`);
    if (document.order_status) fields.push(`Order Status: ${document.order_status}`);
    if (document.amount) fields.push(`Amount: ${document.amount}`);
    if (document.quantity) fields.push(`Quantity: ${document.quantity}`);
    if (document.location) fields.push(`Location: ${document.location}`);
    if (document.dueDate) fields.push(`Due Date: ${document.dueDate instanceof Date ? document.dueDate.toISOString().split('T')[0] : document.dueDate}`);
    if (document.shipping_date) fields.push(`Shipping Date: ${document.shipping_date instanceof Date ? document.shipping_date.toISOString().split('T')[0] : document.shipping_date}`);
    if (document.status) fields.push(`Status: ${document.status}`);
    if (document.customer_name) fields.push(`Customer: ${document.customer_name}`);
    if (document.linenumber) fields.push(`Line Number: ${document.linenumber}`);
    
    return {
      text: fields.join(' ').trim(),
      metadata: {
        type: 'salesOrder',
        ordernumber: document.ordernumber,
        customer: document.customer_name,
        partnumber: document.partnumber,
        status: document.status || document.order_status
      }
    };
  }
  
  // Parts specific processing
  processPart(document, collectionName) {
    const fields = [];
    
    // Process based on your Part schema
    if (document.partnumber) fields.push(`Part Number: ${document.partnumber}`);
    if (document.revision) fields.push(`Revision: ${document.revision}`);
    if (document.description) fields.push(`Description: ${document.description}`);
    if (document.unit_price) fields.push(`Unit Price: ${document.unit_price}`);
    if (document.type) fields.push(`Type: ${document.type}`);
    if (document.category) fields.push(`Category: ${document.category}`);
    if (document.isbom !== undefined) fields.push(`Is BOM: ${document.isbom ? 'Yes' : 'No'}`);
    
    return {
      text: fields.join(' ').trim(),
      metadata: {
        type: 'part',
        partnumber: document.partnumber,
        revision: document.revision,
        category: document.category,
        isbom: document.isbom
      }
    };
  }
  
  // Work Order specific processing
  processWorkOrder(document, collectionName) {
    const fields = [];
    
    // Process based on your WorkOrder schema
    if (document.workorder) fields.push(`Work Order: ${document.workorder}`);
    if (document.type) fields.push(`Type: ${document.type}`);
    if (document.description) fields.push(`Description: ${document.description}`);
    if (document.priority) fields.push(`Priority: ${document.priority}`);
    if (document.status) fields.push(`Status: ${document.status}`);
    if (document.partnumber) fields.push(`Part Number: ${document.partnumber}`);
    if (document.estCost) fields.push(`Estimated Cost: ${document.estCost}`);
    if (document.salesorder) fields.push(`Sales Order: ${document.salesorder}`);
    
    return {
      text: fields.join(' ').trim(),
      metadata: {
        type: 'workorder',
        workorder: document.workorder,
        partnumber: document.partnumber,
        salesorder: document.salesorder,
        status: document.status
      }
    };
  }
  
  // Part BoP specific processing
  processPartBoP(document, collectionName) {
    const fields = [];
    
    // Process based on your PartBoP schema
    if (document.partnumber) fields.push(`Part Number: ${document.partnumber}`);
    if (document.operation) fields.push(`Operation: ${document.operation}`);
    if (document.opcode) fields.push(`Operation Code: ${document.opcode}`);
    if (document.sequence) fields.push(`Sequence: ${document.sequence}`);
    if (document.planner) fields.push(`Planner: ${document.planner}`);
    
    return {
      text: fields.join(' ').trim(),
      metadata: {
        type: 'partbop',
        partnumber: document.partnumber,
        operation: document.operation
      }
    };
  }
  
  // Work Order Execution specific processing
  processWorkOrderExecution(document, collectionName) {
    const fields = [];
    
    // Process based on your WorkOrderExecution schema
    if (document.workorder) fields.push(`Work Order: ${document.workorder}`);
    if (document.serialNumber) fields.push(`Serial Number: ${document.serialNumber}`);
    if (document.timeIn) fields.push(`Time In: ${document.timeIn instanceof Date ? document.timeIn.toISOString() : document.timeIn}`);
    if (document.timeOut) fields.push(`Time Out: ${document.timeOut instanceof Date ? document.timeOut.toISOString() : document.timeOut}`);
    if (document.operation) fields.push(`Operation: ${document.operation}`);
    if (document.partnumber) fields.push(`Part Number: ${document.partnumber}`);
    if (document.status) fields.push(`Status: ${document.status}`);
    if (document.operator) fields.push(`Operator: ${document.operator}`);
    
    return {
      text: fields.join(' ').trim(),
      metadata: {
        type: 'workorderexecution',
        workorder: document.workorder,
        serialNumber: document.serialNumber,
        partnumber: document.partnumber,
        status: document.status
      }
    };
  }

  async similaritySearch(query, filters = {}, limit = 5) {
    try {
      if (!this.isInitialized) {
        throw new Error('Vector service not initialized');
      }
      
      // Generate embedding for the query
      const queryEmbedding = await this.embeddings.embedQuery(query);
      
      // Prepare filter
      const pineconeFilter = {};
      
      // Handle document type filter
      if (filters.type && Array.isArray(filters.type.$in) && filters.type.$in.length > 0) {
        pineconeFilter.type = { $in: filters.type.$in };
      } else if (filters.type) {
        pineconeFilter.type = filters.type;
      }
      
      // Handle other filters
      for (const [key, value] of Object.entries(filters)) {
        if (key !== 'type') {
          pineconeFilter[key] = value;
        }
      }
      
      // Query Pinecone
      const queryResponse = await this.index.query({
        vector: queryEmbedding,
        topK: limit,
        includeMetadata: true,
        filter: Object.keys(pineconeFilter).length > 0 ? pineconeFilter : undefined
      });
      
      // Format results
      return queryResponse.matches.map(match => ({
        pageContent: match.metadata.pageContent,
        metadata: match.metadata
      }));
    } catch (error) {
      console.error('Error in similarity search:', error);
      throw error;
    }
  }
}

module.exports = new VectorService();
