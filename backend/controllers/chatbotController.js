// controllers/chatbotController.js
const { OpenAI } = require('@langchain/openai');
const vectorService = require('../services/vectorService');
const fetch = require('node-fetch');

// Initialize OpenAI
const openAI = new OpenAI({
  apiKey: "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",
  temperature: 0.7
});

// Handle chat queries
exports.chatQuery = async (req, res) => {
  try {
    const { query, filters = {}, documentTypes = [] } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Extract common entity patterns (Sales Orders, Work Orders, Parts)
    const salesOrderRegex = /\b(SO\d+)\b/i;
    const workOrderRegex = /\b(WO\d+)\b/i;
    const partNumberRegex = /\b([A-Z0-9]+-[A-Z0-9]+-\d+)\b/i;
    
    // Detect if the query is looking for blockers or relationships
    const isBlockerQuery = /blocker|issue|risk|problem|impediment/i.test(query);
    const isRelationshipQuery = /related|connection|association|link/i.test(query);
    
    let searchFilters = { ...filters };
    let entityMentioned = null;
    let entityType = null;
    let entityId = null;
    
    // Check for sales order numbers
    const soMatch = query.match(salesOrderRegex);
    if (soMatch) {
      entityMentioned = `sales order ${soMatch[1]}`;
      entityType = "salesOrder";
      entityId = soMatch[1];
      
      // If looking for blockers, prioritize blockers collection with related sales orders
      if (isBlockerQuery) {
        // First try to search in the blockers collection that mention this sales order
        searchFilters = {
          ...searchFilters,
          $or: [
            { source: "blockers", relatedSalesOrderNumbers: soMatch[1] }
          ]
        };
      } else {
        // Otherwise, find both the sales order itself and related documents
        searchFilters = {
          ...searchFilters,
          $or: [
            { source: "salesOrders", ordernumber: soMatch[1] },
            { source: "blockers", relatedSalesOrderNumbers: soMatch[1] }
          ]
        };
      }
    }
    
    // Check for work order numbers
    const woMatch = query.match(workOrderRegex);
    if (woMatch) {
      entityMentioned = `work order ${woMatch[1]}`;
      entityType = "workorder";
      entityId = woMatch[1];
      
      // If looking for blockers, prioritize blockers collection with related work orders
      if (isBlockerQuery) {
        searchFilters = {
          ...searchFilters,
          $or: [
            { source: "blockers", relatedWorkOrderNumbers: woMatch[1] }
          ]
        };
      } else {
        searchFilters = {
          ...searchFilters,
          $or: [
            { source: "workorders", workorder: woMatch[1] },
            { source: "blockers", relatedWorkOrderNumbers: woMatch[1] }
          ]
        };
      }
    }
    
    // Check for part numbers
    const pnMatch = query.match(partNumberRegex);
    if (pnMatch) {
      entityMentioned = `part ${pnMatch[1]}`;
      entityType = "part";
      entityId = pnMatch[1];
      
      // If looking for blockers, prioritize blockers collection with related parts
      if (isBlockerQuery) {
        searchFilters = {
          ...searchFilters,
          $or: [
            { source: "blockers", relatedPartNumbers: pnMatch[1] }
          ]
        };
      } else {
        searchFilters = {
          ...searchFilters,
          $or: [
            { source: "parts", partnumber: pnMatch[1] },
            { source: "blockers", relatedPartNumbers: pnMatch[1] }
          ]
        };
      }
    }
    
    // Apply document type filter if specified and no entity filters were applied
    if (documentTypes && documentTypes.length > 0 && !entityMentioned) {
      searchFilters.type = { $in: documentTypes };
    }
    
    // If we're looking for blockers and an entity was mentioned, try a direct query first
    let relevantDocs = [];
    if (isBlockerQuery && entityMentioned) {
      try {
        // First try to get documents specifically about blockers for this entity
        const blockerDocs = await vectorService.similaritySearch(
          `blockers for ${entityMentioned}`, 
          { source: "blockers", [`related${entityType === 'salesOrder' ? 'SalesOrder' : entityType === 'workorder' ? 'WorkOrder' : 'Part'}Numbers`]: entityId },
          3
        );
        
        if (blockerDocs && blockerDocs.length > 0) {
          relevantDocs = blockerDocs;
        }
      } catch (directQueryError) {
        console.error('Error in direct blocker query:', directQueryError);
        // Continue with the standard query if direct query fails
      }
    }
    
    // If no results from direct query or not a blocker query, use standard vector search
    if (relevantDocs.length === 0) {
      relevantDocs = await vectorService.similaritySearch(query, searchFilters, 5);
    }
    
    if (relevantDocs.length === 0) {
      // Special handling for entity-specific "no results" messages
      if (entityMentioned) {
        if (isBlockerQuery) {
          return res.json({
            answer: `I couldn't find any blockers or issues related to ${entityMentioned} in the database.`
          });
        } else {
          return res.json({
            answer: `I couldn't find any information about ${entityMentioned} in the database. Please check if this entity exists or try a different query.`
          });
        }
      }
      
      return res.json({ 
        answer: "I couldn't find any relevant information in the database. Please try a different query or check if the information has been imported." 
      });
    }
    
    // Add special instructions for entity relationship queries
    let specialInstructions = "";
    if (entityMentioned) {
      if (isBlockerQuery) {
        specialInstructions = `\nPay special attention to whether ${entityMentioned} has any blockers, issues, or risks associated with it. Look carefully at the "Related Sales Order Numbers", "Related Work Order Numbers", and "Related Part Numbers" fields in the context. Make sure to explicitly state if ${entityMentioned} has any blockers.`;
      } else if (isRelationshipQuery) {
        specialInstructions = `\nFocus on the relationships between ${entityMentioned} and other entities in the database.`;
      }
    }
    
    // Create a system prompt that explains the manufacturing context
    const systemPrompt = `
You are a helpful enterprise data assistant that provides information about enterprise data.
You have access to a enterprise database that contains:
- Sales Orders: Contains customer orders, order numbers, due dates, shipping status
- Parts: Contains part information, descriptions, revisions, pricing
- Work Orders: Contains production information, priorities, costs
- Part BoP (Bill of Process): Contains operation sequences and manufacturing processes for parts
- Work Order Execution: Contains information about work order operations and progress
- Blockers: Contains issues, risks, and blockers that may affect parts, work orders, or sales orders

Answer questions based ONLY on the provided context. If the information is not in the context, just say 
"I don't have that information in my database" - do NOT make up information.
When referencing information, be specific about where it comes from (e.g., "according to the sales order records").
Format currency values and dates appropriately.${specialInstructions}`;

    // Customize the prompt based on document types found
    const userPrompt = `
I need information based on the following manufacturing database records:

${relevantDocs.map(doc => doc.pageContent).join('\n\n')}

Question: ${query}

Provide a concise and accurate answer focused specifically on the question.`;
    
    // Generate answer with OpenAI
    const chatMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];
    
    const chatCompletionParams = {
      model: process.env.OPENAI_MODEL || "gpt-4",
      messages: chatMessages,
      max_tokens: 1000,
      temperature: 0.7,
    };
    
    try {
      const chatResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer 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`,
        },
        body: JSON.stringify(chatCompletionParams),
      });
      
      const responseData = await chatResponse.json();
      
      if (responseData.choices && responseData.choices.length > 0) {
        return res.json({ answer: responseData.choices[0].message.content });
      } else {
        throw new Error("Invalid response from OpenAI");
      }
    } catch (openAiError) {
      console.error("OpenAI API error:", openAiError);
      
      // Fallback to the old method if the chat completion fails
      const response = await openAI.invoke({
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        max_tokens: 1000,
      });
      
      res.json({ answer: response });
    }
  } catch (error) {
    console.error('Error processing chat query:', error);
    res.status(500).json({ error: 'Error processing your query' });
  }
};

// Get metadata for filtering
exports.getMetadata = async (req, res) => {
  try {
    // In a production system, you'd query your database for these values
    // This is a simplified example with hardcoded values based on your schema
    res.json({
      documentTypes: [
        { id: 'salesOrder', label: 'Sales Orders' },
        { id: 'part', label: 'Parts' },
        { id: 'workorder', label: 'Work Orders' },
        { id: 'partbop', label: 'Part BoP' },
        { id: 'workorderexecution', label: 'Work Order Execution' },
        { id: 'blockers', label: 'Blockers' }  // Added blockers to the list
      ],
      filters: {
        status: ["Open", "In-progress", "Completed", "Closed", "pending", "shipped", "delivered", "cancelled"],
        priority: ["High", "Medium", "Low"]
      }
    });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ error: 'Error fetching metadata' });
  }
};

// Route for testing the connection to the vector database
exports.testVectorConnection = async (req, res) => {
  try {
    // Attempt to initialize the vector service if not already initialized
    if (!vectorService.isInitialized) {
      await vectorService.initialize();
    }
    
    // Simple query to test the connection
    const testResults = await vectorService.similaritySearch("test query", {}, 1);
    
    res.json({
      status: "success",
      message: "Successfully connected to vector database",
      initialized: vectorService.isInitialized,
      resultsFound: testResults.length
    });
  } catch (error) {
    console.error('Error testing vector connection:', error);
    res.status(500).json({
      status: "error",
      message: "Failed to connect to vector database",
      error: error.message
    });
  }
};

// Advanced search route that provides more details about matches
exports.advancedSearch = async (req, res) => {
  try {
    const { query, filters = {}, documentTypes = [], limit = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Extract entity patterns to enhance search
    const salesOrderRegex = /\b(SO\d+)\b/i;
    const workOrderRegex = /\b(WO\d+)\b/i;
    const partNumberRegex = /\b([A-Z0-9]+-[A-Z0-9]+-\d+)\b/i;
    
    let searchFilters = { ...filters };
    
    // Enhance filters with entity information
    const soMatch = query.match(salesOrderRegex);
    const woMatch = query.match(workOrderRegex);
    const pnMatch = query.match(partNumberRegex);
    
    if (soMatch || woMatch || pnMatch) {
      searchFilters.$or = [];
      
      if (soMatch) {
        searchFilters.$or.push(
          { source: "salesOrders", ordernumber: soMatch[1] },
          { source: "blockers", relatedSalesOrderNumbers: soMatch[1] }
        );
      }
      
      if (woMatch) {
        searchFilters.$or.push(
          { source: "workorders", workorder: woMatch[1] },
          { source: "blockers", relatedWorkOrderNumbers: woMatch[1] }
        );
      }
      
      if (pnMatch) {
        searchFilters.$or.push(
          { source: "parts", partnumber: pnMatch[1] },
          { source: "blockers", relatedPartNumbers: pnMatch[1] }
        );
      }
    }
    
    // Apply document type filter if specified
    if (documentTypes && documentTypes.length > 0) {
      searchFilters.type = { $in: documentTypes };
    }
    
    // Perform similarity search with higher limit for debugging
    const searchResults = await vectorService.similaritySearch(query, searchFilters, limit);
    
    // Return detailed results for analysis
    res.json({
      query: query,
      filters: searchFilters,
      resultCount: searchResults.length,
      results: searchResults.map(doc => ({
        content: doc.pageContent.substring(0, 200) + '...',  // Truncate for readability
        metadata: doc.metadata,
        type: doc.metadata.type,
        source: doc.metadata.source
      }))
    });
  } catch (error) {
    console.error('Error in advanced search:', error);
    res.status(500).json({ error: 'Error performing advanced search' });
  }
};