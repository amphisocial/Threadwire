/**
 * =============================================================================
 * BlockerDetails Component
 * =============================================================================
 * Displays detailed information about a selected blocker including:
 * - Basic info (title, type, description, status, priority)
 * - Estimated completion date and closed date
 * - Related entities (Work Orders, Sales Orders, Parts)
 * - Add/Remove buttons for managing related Sales Orders and Work Orders
 * - Close button to quickly close the blocker
 * - Go To Item navigation for related Sales Orders
 * 
 * Updated: February 6, 2026
 * - Added UI to add/remove related Sales Orders and Work Orders
 * - Fixed to handle populated relatedSalesOrders from backend
 * - Improved styling for remove buttons
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BlockerDetails = ({ selectedBlocker, getAuthHeaders, onBlockerUpdate }) => {
  const navigate = useNavigate();
  const [relatedData, setRelatedData] = useState({
    workOrders: [],
    salesOrders: [],
    parts: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  // For Add Sales Order functionality
  const [showAddSalesOrder, setShowAddSalesOrder] = useState(false);
  const [availableSalesOrders, setAvailableSalesOrders] = useState([]);
  const [selectedSalesOrderToAdd, setSelectedSalesOrderToAdd] = useState('');
  const [isAddingSalesOrder, setIsAddingSalesOrder] = useState(false);
  
  // For Add Work Order functionality
  const [showAddWorkOrder, setShowAddWorkOrder] = useState(false);
  const [availableWorkOrders, setAvailableWorkOrders] = useState([]);
  const [selectedWorkOrderToAdd, setSelectedWorkOrderToAdd] = useState('');
  const [isAddingWorkOrder, setIsAddingWorkOrder] = useState(false);

  /**
   * Fetch related data when blocker selection changes
   */
  useEffect(() => {
    if (selectedBlocker) {
      setRelatedData({
        workOrders: [],
        salesOrders: [],
        parts: []
      });
      fetchRelatedData();
    }
  }, [selectedBlocker]);

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Get display name for assigned user
   */
  const getAssignedToDisplay = () => {
    if (!selectedBlocker.assignedTo) return '-';
    
    if (typeof selectedBlocker.assignedTo === 'object') {
      return selectedBlocker.assignedTo.name || selectedBlocker.assignedTo.email || '-';
    }
    
    return selectedBlocker.assignedTo;
  };

  /**
   * Extract IDs from populated array
   * Handles both populated objects and unpopulated ID strings
   */
  const extractIds = (array) => {
    if (!Array.isArray(array)) return [];
    return array.map(item => typeof item === 'object' ? item._id : item);
  };

  /**
   * Fetch related Work Orders and Parts
   * Sales Orders are already populated in the blocker object
   */
  const fetchRelatedData = async () => {
    setIsLoading(true);
    
    try {
      // Sales Orders are already populated by the backend with ordernumber and amount
      // Extract them directly from the blocker
      const populatedSalesOrders = selectedBlocker.relatedSalesOrders || [];
      const salesOrdersData = populatedSalesOrders
        .filter(so => so && typeof so === 'object')  // Filter out null/undefined and non-objects
        .map(so => ({
          _id: so._id,
          ordernumber: so.ordernumber,
          amount: so.amount,
        }));
      
      const hasWorkOrders = selectedBlocker.relatedWorkOrders && selectedBlocker.relatedWorkOrders.length > 0;
      const hasParts = selectedBlocker.relatedParts && selectedBlocker.relatedParts.length > 0;
      
      const promises = [];
      
      // Fetch Work Orders (if any)
      if (hasWorkOrders) {
        const workOrderIds = extractIds(selectedBlocker.relatedWorkOrders);
        promises.push(
          fetch('/api/workorders', { headers: getAuthHeaders() })
            .then(res => res.ok ? res.json() : [])
            .then(data => {
              const filteredWorkOrders = Array.isArray(data) ? data.filter(wo => 
                workOrderIds.includes(wo._id)
              ) : [];
              return { type: 'workOrders', data: filteredWorkOrders };
            })
            .catch(err => {
              console.error('Error fetching work orders:', err);
              return { type: 'workOrders', data: [] };
            })
        );
      }
      
      // Fetch Parts (if any)
      if (hasParts) {
        const partIds = extractIds(selectedBlocker.relatedParts);
        promises.push(
          fetch('/api/parts', { headers: getAuthHeaders() })
            .then(res => res.ok ? res.json() : [])
            .then(data => {
              const filteredParts = Array.isArray(data) ? data.filter(part => 
                partIds.includes(part._id)
              ) : [];
              return { type: 'parts', data: filteredParts };
            })
            .catch(err => {
              console.error('Error fetching parts:', err);
              return { type: 'parts', data: [] };
            })
        );
      }
      
      // Wait for Work Orders and Parts to load
      const results = await Promise.all(promises);
      const newRelatedData = { 
        workOrders: [], 
        salesOrders: salesOrdersData,  // Use the already-populated data
        parts: [] 
      };
      
      results.forEach(result => {
        newRelatedData[result.type] = result.data;
      });
      
      setRelatedData(newRelatedData);
    } catch (error) {
      console.error("Error fetching related data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch all available Sales Orders for adding
   */
  const fetchAvailableSalesOrders = async () => {
    try {
      const response = await fetch('/api/salesorders', { headers: getAuthHeaders() });
      if (!response.ok) return;
      
      const allSalesOrders = await response.json();
      
      // Filter out already added sales orders
      const currentSalesOrderIds = extractIds(selectedBlocker.relatedSalesOrders || []);
      const available = allSalesOrders.filter(so => !currentSalesOrderIds.includes(so._id));
      
      setAvailableSalesOrders(available);
    } catch (error) {
      console.error('Error fetching available sales orders:', error);
    }
  };

  /**
   * Fetch all available Work Orders for adding
   */
  const fetchAvailableWorkOrders = async () => {
    try {
      const response = await fetch('/api/workorders', { headers: getAuthHeaders() });
      if (!response.ok) return;
      
      const allWorkOrders = await response.json();
      
      // Filter out already added work orders
      const currentWorkOrderIds = extractIds(selectedBlocker.relatedWorkOrders || []);
      const available = allWorkOrders.filter(wo => !currentWorkOrderIds.includes(wo._id));
      
      setAvailableWorkOrders(available);
    } catch (error) {
      console.error('Error fetching available work orders:', error);
    }
  };

  /**
   * Handle Add Sales Order button click
   */
  const handleAddSalesOrderClick = () => {
    setShowAddSalesOrder(true);
    fetchAvailableSalesOrders();
  };

  /**
   * Handle Add Work Order button click
   */
  const handleAddWorkOrderClick = () => {
    setShowAddWorkOrder(true);
    fetchAvailableWorkOrders();
  };

  /**
   * Add selected Sales Order to blocker
   */
  const handleAddSalesOrder = async () => {
    if (!selectedSalesOrderToAdd) {
      alert('Please select a Sales Order');
      return;
    }

    setIsAddingSalesOrder(true);
    
    try {
      const response = await fetch(`/api/blockers/${selectedBlocker._id}/add-salesorder`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ salesOrderId: selectedSalesOrderToAdd }),
      });

      if (!response.ok) {
        throw new Error('Failed to add Sales Order');
      }

      alert('Sales Order added successfully!');
      setShowAddSalesOrder(false);
      setSelectedSalesOrderToAdd('');
      
      // Trigger refresh
      if (onBlockerUpdate) {
        onBlockerUpdate();
      }
    } catch (error) {
      console.error('Error adding sales order:', error);
      alert(`Error adding Sales Order: ${error.message}`);
    } finally {
      setIsAddingSalesOrder(false);
    }
  };

  /**
   * Add selected Work Order to blocker
   */
  const handleAddWorkOrder = async () => {
    if (!selectedWorkOrderToAdd) {
      alert('Please select a Work Order');
      return;
    }

    setIsAddingWorkOrder(true);
    
    try {
      const response = await fetch(`/api/blockers/${selectedBlocker._id}/add-workorder`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ workOrderId: selectedWorkOrderToAdd }),
      });

      if (!response.ok) {
        throw new Error('Failed to add Work Order');
      }

      alert('Work Order added successfully!');
      setShowAddWorkOrder(false);
      setSelectedWorkOrderToAdd('');
      
      // Trigger refresh
      if (onBlockerUpdate) {
        onBlockerUpdate();
      }
    } catch (error) {
      console.error('Error adding work order:', error);
      alert(`Error adding Work Order: ${error.message}`);
    } finally {
      setIsAddingWorkOrder(false);
    }
  };

  /**
   * Remove a Sales Order from blocker
   */
  const handleRemoveSalesOrder = async (salesOrderId) => {
    const confirmRemove = window.confirm('Remove this Sales Order from the blocker?\n\nIf this is the only open blocker for this Sales Order, it will be unblocked.');
    if (!confirmRemove) return;

    try {
      const response = await fetch(`/api/blockers/${selectedBlocker._id}/remove-salesorder`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ salesOrderId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove Sales Order');
      }

      alert('Sales Order removed successfully!');
      
      // Trigger refresh
      if (onBlockerUpdate) {
        onBlockerUpdate();
      }
    } catch (error) {
      console.error('Error removing sales order:', error);
      alert(`Error removing Sales Order: ${error.message}`);
    }
  };

  /**
   * Remove a Work Order from blocker
   */
  const handleRemoveWorkOrder = async (workOrderId) => {
    const confirmRemove = window.confirm('Remove this Work Order from the blocker?\n\nIf this is the only open blocker for this Work Order, it will be unblocked.');
    if (!confirmRemove) return;

    try {
      const response = await fetch(`/api/blockers/${selectedBlocker._id}/remove-workorder`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ workOrderId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove Work Order');
      }

      alert('Work Order removed successfully!');
      
      // Trigger refresh
      if (onBlockerUpdate) {
        onBlockerUpdate();
      }
    } catch (error) {
      console.error('Error removing work order:', error);
      alert(`Error removing Work Order: ${error.message}`);
    }
  };

  /**
   * Handle Close Blocker button click
   * Calls PUT /api/blockers/:id/close endpoint
   */
  const handleCloseBlocker = async () => {
    if (selectedBlocker.status === 'Closed') {
      alert('This blocker is already closed.');
      return;
    }

    const confirmClose = window.confirm(
      `Are you sure you want to close this blocker?\n\n"${selectedBlocker.title}"\n\nThis will set the status to "Closed" and record the current date.`
    );

    if (!confirmClose) return;

    setIsClosing(true);
    
    try {
      const response = await fetch(`/api/blockers/${selectedBlocker._id}/close`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to close blocker');
      }

      const result = await response.json();
      alert('Blocker closed successfully!');
      
      // Trigger refresh if callback provided
      if (onBlockerUpdate) {
        onBlockerUpdate();
      }
    } catch (error) {
      console.error('Error closing blocker:', error);
      alert(`Error closing blocker: ${error.message}`);
    } finally {
      setIsClosing(false);
    }
  };

  /**
   * Navigate to Sales Order details page
   */
  const handleGoToSalesOrder = (salesOrder) => {
    navigate('/salesorders', { 
      state: { 
        selectedOrderId: salesOrder._id,
        selectedOrderNumber: salesOrder.ordernumber 
      } 
    });
  };

  // Don't render if no blocker selected
  if (!selectedBlocker) return null;

  /**
   * Check if there's any related data loaded
   */
  const hasAnyRelatedData = () => {
    return (
      relatedData.workOrders.length > 0 || 
      relatedData.salesOrders.length > 0 || 
      relatedData.parts.length > 0
    );
  };

  /**
   * Check if there are relations defined but no data exists
   */
  const hasRelationsDefinedButEmpty = () => {
    const hasWorkOrderRefs = selectedBlocker.relatedWorkOrders && selectedBlocker.relatedWorkOrders.length > 0;
    const hasSalesOrderRefs = selectedBlocker.relatedSalesOrders && selectedBlocker.relatedSalesOrders.length > 0;
    const hasPartRefs = selectedBlocker.relatedParts && selectedBlocker.relatedParts.length > 0;
    
    return (hasWorkOrderRefs || hasSalesOrderRefs || hasPartRefs);
  };

  return (
    <div className="blocker-details">
      {/* Header with Title and Close Button */}
      <div className="blocker-details-header">
        <h2>Blocker Details</h2>
        
        {/* Close Button - Only show if not already closed */}
        {selectedBlocker.status !== 'Closed' && (
          <button 
            className="close-blocker-btn"
            onClick={handleCloseBlocker}
            disabled={isClosing}
          >
            {isClosing ? 'Closing...' : '✓ Close Blocker'}
          </button>
        )}
      </div>

      {/* Basic Information */}
      <div className="detail-item">
        <strong>Title:</strong> {selectedBlocker.title}
      </div>
      <div className="detail-item">
        <strong>Type:</strong> {selectedBlocker.type || 'Issue'}
      </div>
      <div className="detail-item">
        <strong>Description:</strong> {selectedBlocker.description || selectedBlocker.category || 'No Description'}
      </div>
      <div className="detail-item">
        <strong>Status:</strong> 
        <span className={`status-badge status-${(selectedBlocker.status || 'open').toLowerCase().replace(' ', '-')}`}>
          {selectedBlocker.status || 'Open'}
        </span>
      </div>
      <div className="detail-item">
        <strong>Priority:</strong> {selectedBlocker.priority || 'Low'}
      </div>
      <div className="detail-item">
        <strong>Assigned To:</strong> {getAssignedToDisplay()}
      </div>
      
      {/* Date Information */}
      <div className="detail-item">
        <strong>Est. Completion:</strong> {formatDate(selectedBlocker.estimatedCompletionDate)}
      </div>
      {selectedBlocker.status === 'Closed' && selectedBlocker.closedDate && (
        <div className="detail-item">
          <strong>Closed Date:</strong> {formatDate(selectedBlocker.closedDate)}
        </div>
      )}
      <div className="detail-item">
        <strong>Created:</strong> {formatDate(selectedBlocker.createdAt)}
      </div>
      
      {/* Related Entities Section */}
      <div className="detail-item">
        <strong>Related Items:</strong>
        {isLoading ? (
          <div className="loading-data">Loading related data...</div>
        ) : (
          <div className="related-data-container">
            {/* Work Orders Section */}
            <div className="related-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>Work Orders</h3>
                <button 
                  onClick={handleAddWorkOrderClick}
                  className="add-related-btn"
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  ➕ Add Work Order
                </button>
              </div>
              
              {relatedData.workOrders.length > 0 ? (
                <div className="related-items">
                  {relatedData.workOrders.map(wo => (
                    <div 
                      key={wo._id} 
                      className="related-item" 
                      style={{ 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        padding: '12px',
                        marginBottom: '8px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        backgroundColor: '#f9f9f9'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div><strong>Work Order:</strong> {wo.workorder}</div>
                        <div><strong>Part Number:</strong> {wo.partnumber}</div>
                        <div><strong>Quantity:</strong> {wo.quantity || 'N/A'}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveWorkOrder(wo._id)}
                        className="remove-related-btn"
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '18px',
                          cursor: 'pointer',
                          padding: '0',
                          marginLeft: '10px',
                          color: '#dc3545',
                          lineHeight: '1'
                        }}
                        title="Remove this Work Order"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-related-data" style={{ fontStyle: 'italic', color: '#666', padding: '10px 0' }}>
                  No Work Orders linked
                </div>
              )}
            </div>
            
            {/* Sales Orders Section */}
            <div className="related-section" style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>Sales Orders</h3>
                <button 
                  onClick={handleAddSalesOrderClick}
                  className="add-related-btn"
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  ➕ Add Sales Order
                </button>
              </div>
              
              {relatedData.salesOrders.length > 0 ? (
                <div className="related-items">
                  {relatedData.salesOrders.map(so => (
                    <div 
                      key={so._id} 
                      className="related-item" 
                      style={{ 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        padding: '12px',
                        marginBottom: '8px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        backgroundColor: '#f9f9f9'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div><strong>Order Number:</strong> {so.ordernumber}</div>
                        {so.amount && (
                          <div><strong>Amount:</strong> ${so.amount.toLocaleString()}</div>
                        )}
                        <button 
                          className="go-to-item-btn"
                          onClick={() => handleGoToSalesOrder(so)}
                          title="Navigate to this Sales Order"
                          style={{ marginTop: '8px' }}
                        >
                          → Go To Item
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveSalesOrder(so._id)}
                        className="remove-related-btn"
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '18px',
                          cursor: 'pointer',
                          padding: '0',
                          marginLeft: '10px',
                          color: '#dc3545',
                          lineHeight: '1'
                        }}
                        title="Remove this Sales Order"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-related-data" style={{ fontStyle: 'italic', color: '#666', padding: '10px 0' }}>
                  No Sales Orders linked
                </div>
              )}
            </div>
            
            {/* Parts Section (Read-only for now) */}
            {relatedData.parts.length > 0 && (
              <div className="related-section" style={{ marginTop: '20px' }}>
                <h3>Parts</h3>
                <div className="related-items">
                  {relatedData.parts.map(part => (
                    <div 
                      key={part._id} 
                      className="related-item"
                      style={{ 
                        padding: '12px',
                        marginBottom: '8px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        backgroundColor: '#f9f9f9'
                      }}
                    >
                      <div><strong>Part Number:</strong> {part.partnumber}</div>
                      <div><strong>Category:</strong> {part.category || 'N/A'}</div>
                      <div><strong>Description:</strong> {part.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Sales Order Modal */}
      {showAddSalesOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            minWidth: '450px',
            maxWidth: '600px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0 }}>Add Sales Order to Blocker</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
              Select a Sales Order to link with this blocker
            </p>
            <select 
              value={selectedSalesOrderToAdd}
              onChange={(e) => setSelectedSalesOrderToAdd(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '20px',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            >
              <option value="">-- Select a Sales Order --</option>
              {availableSalesOrders.map(so => (
                <option key={so._id} value={so._id}>
                  {so.ordernumber} {so.partnumber ? `- ${so.partnumber}` : ''} {so.amount ? `($${so.amount.toLocaleString()})` : ''}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  setShowAddSalesOrder(false);
                  setSelectedSalesOrderToAdd('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleAddSalesOrder}
                disabled={isAddingSalesOrder || !selectedSalesOrderToAdd}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isAddingSalesOrder || !selectedSalesOrderToAdd ? 'not-allowed' : 'pointer',
                  opacity: isAddingSalesOrder || !selectedSalesOrderToAdd ? 0.6 : 1,
                  fontSize: '14px'
                }}
              >
                {isAddingSalesOrder ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Work Order Modal */}
      {showAddWorkOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            minWidth: '450px',
            maxWidth: '600px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0 }}>Add Work Order to Blocker</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
              Select a Work Order to link with this blocker
            </p>
            <select 
              value={selectedWorkOrderToAdd}
              onChange={(e) => setSelectedWorkOrderToAdd(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '20px',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            >
              <option value="">-- Select a Work Order --</option>
              {availableWorkOrders.map(wo => (
                <option key={wo._id} value={wo._id}>
                  {wo.workorder} {wo.partnumber ? `- ${wo.partnumber}` : ''}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  setShowAddWorkOrder(false);
                  setSelectedWorkOrderToAdd('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleAddWorkOrder}
                disabled={isAddingWorkOrder || !selectedWorkOrderToAdd}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isAddingWorkOrder || !selectedWorkOrderToAdd ? 'not-allowed' : 'pointer',
                  opacity: isAddingWorkOrder || !selectedWorkOrderToAdd ? 0.6 : 1,
                  fontSize: '14px'
                }}
              >
                {isAddingWorkOrder ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockerDetails;
