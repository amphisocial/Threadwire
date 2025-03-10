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
    
    // Apply document type filter if specified
    let searchFilters = { ...filters };
    if (documentTypes && documentTypes.length > 0) {
      searchFilters.type = { $in: documentTypes };
    }
    
    // Get relevant documents using vector search
    const relevantDocs = await vectorService.similaritySearch(query, searchFilters, 5);
    
    if (relevantDocs.length === 0) {
      return res.json({ 
        answer: "I couldn't find any relevant information in the database. Please try a different query or check if the information has been imported." 
      });
    }
    
    // Construct the prompt with context
    const context = relevantDocs
      .map(doc => doc.pageContent)
      .join('\n\n');
    
    // Create a system prompt that explains the manufacturing context
    const systemPrompt = `
You are a helpful manufacturing assistant that provides information about manufacturing data.
You have access to a manufacturing database that contains:
- Sales Orders: Contains customer orders, order numbers, due dates, shipping status
- Parts: Contains part information, descriptions, revisions, pricing
- Work Orders: Contains production information, priorities, costs
- Part BoP (Bill of Process): Contains operation sequences and manufacturing processes for parts
- Work Order Execution: Contains information about work order operations and progress

Answer questions based ONLY on the provided context. If the information is not in the context, just say 
"I don't have that information in my database" - do NOT make up information.
When referencing information, be specific about where it comes from (e.g., "according to the sales order records").
Format currency values and dates appropriately.`;

    // Customize the prompt based on document types found
    const userPrompt = `
I need information based on the following manufacturing database records:

${context}

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
        { id: 'workorderexecution', label: 'Work Order Execution' }
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
    
    // Apply document type filter if specified
    let searchFilters = { ...filters };
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
