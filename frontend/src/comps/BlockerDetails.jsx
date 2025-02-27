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
      // Fetch related work orders
      if (selectedBlocker.relatedWorkOrders && selectedBlocker.relatedWorkOrders.length > 0) {
        const workOrderPromises = selectedBlocker.relatedWorkOrders
          .filter(id => id) // Filter out null values
          .map(id => 
            fetch(`/api/workorders/${id}`, { headers: getAuthHeaders() })
              .then(res => res.ok ? res.json() : null)
              .catch(err => {
                console.error(`Error fetching work order ${id}:`, err);
                return null;
              })
          );
        
        const workOrders = (await Promise.all(workOrderPromises)).filter(wo => wo);
        setRelatedData(prev => ({ ...prev, workOrders }));
      }
      
      // Fetch related sales orders
      if (selectedBlocker.relatedSalesOrders && selectedBlocker.relatedSalesOrders.length > 0) {
        const salesOrderPromises = selectedBlocker.relatedSalesOrders
          .filter(id => id) // Filter out null values
          .map(id => 
            fetch(`/api/salesorders/${id}`, { headers: getAuthHeaders() })
              .then(res => res.ok ? res.json() : null)
              .catch(err => {
                console.error(`Error fetching sales order ${id}:`, err);
                return null;
              })
          );
        
        const salesOrders = (await Promise.all(salesOrderPromises)).filter(so => so);
        setRelatedData(prev => ({ ...prev, salesOrders }));
      }
      
      // Fetch related parts
      if (selectedBlocker.relatedParts && selectedBlocker.relatedParts.length > 0) {
        const partPromises = selectedBlocker.relatedParts
          .filter(id => id) // Filter out null values
          .map(id => 
            fetch(`/api/parts/${id}`, { headers: getAuthHeaders() })
              .then(res => res.ok ? res.json() : null)
              .catch(err => {
                console.error(`Error fetching part ${id}:`, err);
                return null;
              })
          );
        
        const parts = (await Promise.all(partPromises)).filter(part => part);
        setRelatedData(prev => ({ ...prev, parts }));
      }
    } catch (error) {
      console.error("Error fetching related data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedBlocker) return null;

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
        ) : (
          <div className="related-data-container">
            {relatedData.workOrders.length > 0 && (
              <div className="related-section">
                <h3>Work Orders</h3>
                <div className="related-items">
                  {relatedData.workOrders.map(wo => (
                    <div key={wo._id} className="related-item">
                      <div><strong>Work Order:</strong> {wo.workorder}</div>
                      <div><strong>Part Number:</strong> {wo.partnumber}</div>
                      <div><strong>Quantity:</strong> {wo.quantity}</div>
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
            
            {relatedData.workOrders.length === 0 && 
             relatedData.salesOrders.length === 0 && 
             relatedData.parts.length === 0 && (
              <div className="no-related-data">
                No related documents found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockerDetails;