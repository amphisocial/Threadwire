import React, { useState, useEffect } from 'react';

const BlockerDetails = ({ selectedBlocker, getAuthHeaders }) => {
  const [relatedData, setRelatedData] = useState({
    workOrders: [],
    salesOrders: [],
    parts: []
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedBlocker) {
      fetchRelatedData();
    }
  }, [selectedBlocker]);

  const fetchRelatedData = async () => {
    setIsLoading(true);
    
    try {
        const hasWorkOrders = selectedBlocker.relatedWorkOrders && selectedBlocker.relatedWorkOrders.length > 0;
        const hasSalesOrders = selectedBlocker.relatedSalesOrders && selectedBlocker.relatedSalesOrders.length > 0;
        const hasParts = selectedBlocker.relatedParts && selectedBlocker.relatedParts.length > 0;
        
        // Only fetch data if there are related items
        if (hasWorkOrders || hasSalesOrders || hasParts) {
          const promises = [];
          
          // Fetch all work orders and filter on client side
          if (hasWorkOrders) {
            promises.push(
              fetch('/api/workorders', { headers: getAuthHeaders() })
                .then(res => res.ok ? res.json() : [])
                .then(data => {
                  // Filter to only include related work orders
                  const filteredWorkOrders = Array.isArray(data) ? data.filter(wo => 
                    selectedBlocker.relatedWorkOrders.includes(wo._id)
                  ) : [];
                  
                  return { type: 'workOrders', data: filteredWorkOrders };
                })
                .catch(err => {
                  console.error('Error fetching work orders:', err);
                  return { type: 'workOrders', data: [] };
                })
            );
          }
          
          // Fetch all sales orders and filter on client side
          if (hasSalesOrders) {
            promises.push(
              fetch('/api/salesorders', { headers: getAuthHeaders() })
                .then(res => res.ok ? res.json() : [])
                .then(data => {
                  // Filter to only include related sales orders
                  const filteredSalesOrders = Array.isArray(data) ? data.filter(so => 
                    selectedBlocker.relatedSalesOrders.includes(so._id)
                  ) : [];
                  
                  return { type: 'salesOrders', data: filteredSalesOrders };
                })
                .catch(err => {
                  console.error('Error fetching sales orders:', err);
                  return { type: 'salesOrders', data: [] };
                })
            );
          }
          
          // Fetch all parts and filter on client side
          if (hasParts) {
            promises.push(
              fetch('/api/parts', { headers: getAuthHeaders() })
                .then(res => res.ok ? res.json() : [])
                .then(data => {
                  // Filter to only include related parts
                  const filteredParts = Array.isArray(data) ? data.filter(part => 
                    selectedBlocker.relatedParts.includes(part._id)
                  ) : [];
                  
                  return { type: 'parts', data: filteredParts };
                })
                .catch(err => {
                  console.error('Error fetching parts:', err);
                  return { type: 'parts', data: [] };
                })
            );
          }
          
          // Process all promises
          const results = await Promise.all(promises);
          
          // Update state with results
          const newRelatedData = { workOrders: [], salesOrders: [], parts: [] };
          
          results.forEach(result => {
            newRelatedData[result.type] = result.data;
          });
          
          setRelatedData(newRelatedData);
        }
    } catch (error) {
      console.error("Error fetching related data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedBlocker) return null;

  const hasAnyRelatedData = () => {
    return (
      relatedData.workOrders.length > 0 || 
      relatedData.salesOrders.length > 0 || 
      relatedData.parts.length > 0
    );
  };

  return (
    <div className="blocker-details">
      <h2>Blocker Details</h2>
      <div className="detail-item">
        <strong>Title:</strong> {selectedBlocker.title }
      </div>
      <div className="detail-item">
        <strong>Type:</strong> {selectedBlocker.type || 'Issue'}
      </div>
      <div className="detail-item">
        <strong>Description/Category:</strong> {selectedBlocker.description || selectedBlocker.category || 'No Description'}
      </div>
      <div className="detail-item">
        <strong>Status:</strong> {selectedBlocker.status}
      </div>
      <div className="detail-item">
        <strong>Priority:</strong> {selectedBlocker.priority}
      </div>
      
      <div className="detail-item">
        <strong>Origin:</strong>
        {isLoading ? (
          <div className="loading-data">Loading related data...</div>
        ) : hasAnyRelatedData() ? (
          <div className="related-data-container">
            {relatedData.workOrders.length > 0 && (
              <div className="related-section">
                <h3>Work Orders</h3>
                <div className="related-items">
                  {relatedData.workOrders.map(wo => (
                    <div key={wo._id} className="related-item">
                      <div><strong>Work Order:</strong> {wo.workorder}</div>
                      <div><strong>Part Number:</strong> {wo.partnumber}</div>
                      <div><strong>Quantity:</strong> {wo.quantity || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {relatedData.salesOrders.length > 0 && (
              <div className="related-section">
                <h3>Sales Orders</h3>
                <div className="related-items">
                  {relatedData.salesOrders.map(so => (
                    <div key={so._id} className="related-item">
                      <div><strong>Order Number:</strong> {so.ordernumber}</div>
                      <div><strong>Part Number:</strong> {so.partnumber}</div>
                      <div><strong>Line:</strong> {so.linenumber}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {relatedData.parts.length > 0 && (
              <div className="related-section">
                <h3>Parts</h3>
                <div className="related-items">
                  {relatedData.parts.map(part => (
                    <div key={part._id} className="related-item">
                      <div><strong>Part Number:</strong> {part.partnumber}</div>
                      <div><strong>Category:</strong> {part.category || 'N/A'}</div>
                      <div><strong>Description:</strong> {part.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : hasRelationsButNoData() ? (
          <div className="no-related-data">
            Related items exist but could not be found in the database
          </div>
        ) : (
          <div className="no-related-data">
            No related documents found
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockerDetails;