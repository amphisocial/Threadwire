const mongoose = require('mongoose');
const ApiUsage = require('../models/ApiUsage');

const getApiUsageByCompany = async (customerId, options = {}) => {
  try {
    const { startDate, endDate, limit = 100 } = options;
    
    let query = { customerId };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const usage = await ApiUsage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
      
    return usage;
  } catch (error) {
    throw new Error(`Failed to fetch API usage: ${error.message}`);
  }
};

const getApiUsageSummary = async (customerId, options = {}) => {
  try {
    const { startDate, endDate } = options;
    
    let matchStage = { customerId: new mongoose.Types.ObjectId(customerId) };
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    
    const summary = await ApiUsage.aggregate([
      { $match: matchStage },
      { $group: {
        _id: { 
          endpoint: '$endpoint',
          method: '$method'
        },
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
        successCount: { 
          $sum: { 
            $cond: [{ $lt: ['$statusCode', 400] }, 1, 0]
          }
        },
        errorCount: { 
          $sum: { 
            $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
          }
        }
      }},
      { $sort: { count: -1 } }
    ]);
    
    return summary;
  } catch (error) {
    throw new Error(`Failed to generate API usage summary: ${error.message}`);
  }
};

module.exports = {
  getApiUsageByCompany,
  getApiUsageSummary
};
