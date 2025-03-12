// services/changeStreamService.js
const vectorService = require('./vectorService');

class ChangeStreamService {
  constructor() {
    this.changeStreams = {};
    this.isInitialized = false;
    this.db = null;
    this.excludedCollections = ['system.views', 'vector_embeddings']; // Collections to exclude
  }

  async initialize(db) {
    if (this.isInitialized) return;
    
    this.db = db;
    this.isInitialized = true;
    
    // Discover all collections and monitor them
    await this.monitorAllCollections();
    
    console.log('Change stream service initialized');
  }
  
  async monitorAllCollections() {
    try {
      // Get all collections in the database
      const collections = await this.db.listCollections().toArray();
      
      console.log(`Found ${collections.length} collections in database`);
      
      // Set up monitoring for each collection
      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        
        // Skip excluded collections
        if (this.excludedCollections.includes(collectionName)) {
          console.log(`Skipping excluded collection: ${collectionName}`);
          continue;
        }
        
        await this.monitorCollection(collectionName);
      }
    } catch (error) {
      console.error('Error discovering collections:', error);
    }
  }
  
  async monitorCollection(collectionName) {
    try {
      const collection = this.db.collection(collectionName);
      
      // Create a change stream for inserts and updates
      const changeStream = collection.watch([
        { $match: { $or: [
          { operationType: 'insert' },
          { operationType: 'update' }
        ]}}
      ]);
      
      // Store the change stream so we can close it later if needed
      this.changeStreams[collectionName] = changeStream;
      
      // Listen for changes
      changeStream.on('change', async (change) => {
        try {
          console.log(`Change detected in ${collectionName}:`, change.operationType);
          
          let document;
          
          if (change.operationType === 'insert') {
            // For insert operations, use the full document
            document = change.fullDocument;
          } else if (change.operationType === 'update') {
            // For update operations, fetch the updated document
            document = await collection.findOne({ _id: change.documentKey._id });
          }
          
          if (document) {
            // Process the document for vector embeddings
            await vectorService.processDocument(document, collectionName);
            console.log(`Processed ${change.operationType} in ${collectionName} for vector database`);
          }
        } catch (error) {
          console.error(`Error processing change in ${collectionName}:`, error);
        }
      });
      
      console.log(`Monitoring ${collectionName} for changes`);
      
    } catch (error) {
      console.error(`Error setting up change stream for ${collectionName}:`, error);
    }
  }
  
  closeAll() {
    Object.keys(this.changeStreams).forEach(key => {
      if (this.changeStreams[key]) {
        this.changeStreams[key].close();
        console.log(`Closed change stream for ${key}`);
      }
    });
    
    this.changeStreams = {};
    this.isInitialized = false;
  }
}

module.exports = new ChangeStreamService();