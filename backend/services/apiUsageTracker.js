// middleware/apiUsageTracker.js
const ApiUsage = require('../models/ApiUsage');

const trackApiUsage = async (req, res, next) => {
  // Only track customer API requests
  if (!req.customer || !req.customer.isApiRequest) {
    return next();
  }
  
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to capture response data
  res.end = function() {
    const responseTime = Date.now() - startTime;
    
    // Create usage record
    const usage = new ApiUsage({
      customerId: req.customer.id,
      tokenName: req.customer.tokenName,
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
      responseTime
    });
    
    // Save asynchronously - don't wait for it
    usage.save().catch(err => {
      console.error('Error saving API usage log:', err);
    });
    
    // Call the original end function
    originalEnd.apply(res, arguments);
  };
  
  next();
};

module.exports = trackApiUsage;