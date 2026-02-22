/**
 * =============================================================================
 * Sales Orders Page Component
 * =============================================================================
 * Main page for managing Sales Orders with blocker functionality.
 * 
 * Updated: February 3, 2026
 * Change: Fixed React error #31 - assignedTo is an object {_id, email}, not string
 *         Now safely extracts email/name from object before rendering
 * 
 * Previous Updates:
 * - Fixed auto-open modal - use useRef to track if navigation state processed
 * - Added auto-open Order Details modal when navigating from Blockers page
 * - Added Order Details modal with blockers and action items display
 * - Added handlers for 3-dot menu blocker actions from table component
 * =============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../comps/NavBar';
import SalesOrdersTable from '../comps/SalesOrdersTable';
import BlockerModal from '../comps/BlockerModal';
import ImportModal from '../comps/ImportModal';
import './salesOrders.css';

const SalesOrdersApp = () => {
  // React Router hook for navigation state (from "Go To Item" on Blockers page)
  const location = useLocation();
  
  // Ref to track if we've already processed the navigation state
  // This prevents re-triggering on component re-renders
  const hasProcessedNavigation = useRef(false);
  
  const [selectedSalesOrder, setSelectedSalesOrder] = useState(null);
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentBlockerId, setCurrentBlockerId] = useState(null);
  const [salesOrders, setSalesOrders] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const blockerModalRef = useRef(null);

  // State for blocker selection modal (when multiple blockers exist)
  const [showBlockerSelectModal, setShowBlockerSelectModal] = useState(false);
  const [availableBlockers, setAvailableBlockers] = useState([]);
  
  // Flag to track if we need to auto-open Order Details after data loads
  const [pendingOrderDetailsId, setPendingOrderDetailsId] = useState(null);

  // =========================================================================
  // State for Order Details modal
  // =========================================================================
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [orderDetailsBlockers, setOrderDetailsBlockers] = useState([]);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  // Track which blocker's action items are expanded (by blocker ID)
  const [expandedActionItems, setExpandedActionItems] = useState({});

  /**
   * Get authentication headers for API calls
   */
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(isGoogleAuth && { 'Auth-Type': 'google' }),
    };
  };

  /**
   * Helper function to safely render assignedTo field
   * assignedTo can be either a string OR an object {_id, email, name}
   * This prevents React error #31 when trying to render an object
   * @param {string|Object} assignedTo - The assignedTo value
   * @returns {string} Safe string representation
   */
  const renderAssignedTo = (assignedTo) => {
    if (!assignedTo) return null;
    if (typeof assignedTo === 'string') return assignedTo;
    if (typeof assignedTo === 'object') {
      return assignedTo.email || assignedTo.name || 'Assigned';
    }
    return String(assignedTo);
  };

  useEffect(() => {
    loadSalesOrders();
    document.title = 'Sales Orders';
    
    // Check if we navigated here from "Go To Item" on Blockers page
    // Only process ONCE using ref to prevent re-processing on re-renders
    if (location.state?.selectedOrderId && !hasProcessedNavigation.current) {
      hasProcessedNavigation.current = true;
      setPendingOrderDetailsId(location.state.selectedOrderId);
    }
  }, []);

  /**
   * Effect to auto-open Order Details modal after sales orders are loaded
   * This triggers when navigating from "Go To Item" on Blockers page
   */
  useEffect(() => {
    if (pendingOrderDetailsId && salesOrders.length > 0 && !isLoading) {
      // Find the order that matches the navigation state
      const targetOrder = salesOrders.find(
        order => order._id === pendingOrderDetailsId
      );
      
      if (targetOrder) {
        // Select the order and open the Order Details modal
        setSelectedSalesOrder(targetOrder);
        // Call handleViewDetails directly (no setTimeout needed)
        openOrderDetailsModal(targetOrder);
      }
      
      // Clear the pending ID so this doesn't re-trigger
      setPendingOrderDetailsId(null);
    }
  }, [salesOrders, isLoading, pendingOrderDetailsId]);

  /**
   * Load all sales orders from API
   */
  const loadSalesOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/salesorders", {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch sales orders');
      }
      const data = await response.json();
      setSalesOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading sales orders:", error);
      setError(error.message);
      setSalesOrders([]); 
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle "Add Risk/Issue" button click (from navbar)
   * Requires a sales order to be selected first
   */
  const handleAddRiskIssue = () => {
    if (!selectedSalesOrder) {
      alert("Please select a Sales Order row first.");
      return;
    }
    setCurrentBlockerId(null);
    setShowBlockerModal(true);
  };

  /**
   * Handle "Add Blocker" from 3-dot menu
   * Called directly from table row, order is passed in
   * @param {Object} order - The sales order to add blocker to
   */
  const handleAddBlockerFromMenu = (order) => {
    // Order is already selected by the table component
    setCurrentBlockerId(null); // null = creating new blocker
    setShowBlockerModal(true);
  };

  /**
   * Handle "Edit Risk/Issue" - shows selection modal when multiple blockers exist
   */
  const handleEditRiskIssue = async () => {
    if (!selectedSalesOrder) {
      alert("Please select a Sales Order row first.");
      return;
    }
    await fetchAndShowBlockers(selectedSalesOrder);
  };

  /**
   * Handle "Edit Blocker" from 3-dot menu
   * Called directly from table row, order is passed in
   * @param {Object} order - The sales order to edit blocker for
   */
  const handleEditBlockerFromMenu = async (order) => {
    // Order is already selected by the table component
    await fetchAndShowBlockers(order);
  };

  /**
   * Fetch blockers for an order and show appropriate modal
   * Shared logic between navbar button and 3-dot menu
   * @param {Object} order - The sales order to fetch blockers for
   */
  const fetchAndShowBlockers = async (order) => {
    const orderId = order._id || order.id || order.salesOrderId;
    
    try {
      const res = await fetch(`/api/blockers?relatedSalesOrders=${orderId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const blockers = await res.json();

      if (!blockers || blockers.length === 0) {
        alert("No existing Risk/Issue found for this Sales Order.");
        return;
      }

      // If multiple blockers, show selection modal
      if (blockers.length > 1) {
        setAvailableBlockers(blockers);
        setShowBlockerSelectModal(true);
      } else {
        // Only one blocker - open it directly
        setCurrentBlockerId(blockers[0]._id);
        setShowBlockerModal(true);
      }
    } catch (err) {
      console.error("Error finding blockers:", err);
      alert("Failed to find risk/issue for this Sales Order.");
    }
  };

  /**
   * Handler when user selects a blocker from the selection modal
   * @param {string} blockerId - The ID of the selected blocker
   */
  const handleBlockerSelect = (blockerId) => {
    setCurrentBlockerId(blockerId);
    setShowBlockerSelectModal(false);
    setShowBlockerModal(true);
  };

  // =========================================================================
  // Order Details Modal Functions
  // =========================================================================

  /**
   * Open the Order Details modal and fetch blockers
   * Separated from handleViewDetails to allow direct calls without async issues
   * @param {Object} order - The sales order to view details for
   */
  const openOrderDetailsModal = async (order) => {
    setShowOrderDetailsModal(true);
    setOrderDetailsLoading(true);
    setExpandedActionItems({}); // Reset expanded state
    
    try {
      // Fetch blockers for this order
      const orderId = order._id || order.id || order.salesOrderId;
      const res = await fetch(`/api/blockers?relatedSalesOrders=${orderId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const blockers = await res.json();
      
      // For each blocker, fetch its action items
      const blockersWithActions = await Promise.all(
        (blockers || []).map(async (blocker) => {
          try {
            const actionsRes = await fetch(`/api/action-items?blockerId=${blocker._id}`, {
              method: 'GET',
              headers: getAuthHeaders(),
            });
            const actions = await actionsRes.json();
            return { ...blocker, actionItems: Array.isArray(actions) ? actions : [] };
          } catch (err) {
            console.error(`Error fetching actions for blocker ${blocker._id}:`, err);
            return { ...blocker, actionItems: [] };
          }
        })
      );
      
      setOrderDetailsBlockers(blockersWithActions);
    } catch (err) {
      console.error("Error fetching order details:", err);
      setOrderDetailsBlockers([]);
    } finally {
      setOrderDetailsLoading(false);
    }
  };

  /**
   * Handle "View Details" from 3-dot menu
   * Opens the Order Details modal with all order info and blockers
   * @param {Object} order - The sales order to view details for
   */
  const handleViewDetails = (order) => {
    openOrderDetailsModal(order);
  };

  /**
   * Close the Order Details modal
   */
  const handleOrderDetailsClose = () => {
    setShowOrderDetailsModal(false);
    setOrderDetailsBlockers([]);
    setExpandedActionItems({});
  };

  /**
   * Toggle action items expansion for a specific blocker
   * @param {string} blockerId - The blocker ID to toggle
   */
  const toggleActionItemsExpanded = (blockerId) => {
    setExpandedActionItems(prev => ({
      ...prev,
      [blockerId]: !prev[blockerId]
    }));
  };

  /**
   * Open blocker edit modal from within Order Details modal
   * @param {string} blockerId - The blocker ID to edit
   */
  const handleEditBlockerFromDetails = (blockerId) => {
    setCurrentBlockerId(blockerId);
    setShowOrderDetailsModal(false); // Close details modal
    setShowBlockerModal(true); // Open edit modal
  };

  /**
   * Open add blocker modal from within Order Details modal
   */
  const handleAddBlockerFromDetails = () => {
    setCurrentBlockerId(null);
    setShowOrderDetailsModal(false); // Close details modal
    setShowBlockerModal(true); // Open create modal
  };

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="app-container">
      <Navbar />
      <div className="content-container">
        <h2>Sales Orders</h2>
        <div className="wo-section-navbar">
          <button 
            onClick={() => setShowImportModal(true)}
            className="wo-import-button"
          >
            Import CSV
          </button>
          <button 
            onClick={handleAddRiskIssue}
            className="wo-risk-button"
          >
            + Add Risk/Issue
          </button>
          <button 
            onClick={handleEditRiskIssue}
            className="wo-risk-button"
          >
            Edit Risk/Issue
          </button>
        </div>

        {error && (
          <div className="error-message">
            Error loading sales orders: {error}
          </div>
        )}

        {isLoading ? (
          <div className="loading-message">Loading sales orders...</div>
        ) : (
          <SalesOrdersTable 
            salesOrders={salesOrders}
            selectedSalesOrder={selectedSalesOrder}
            onSelectSalesOrder={setSelectedSalesOrder}
            onUpdateSalesOrders={loadSalesOrders}
            // Pass handlers for 3-dot menu actions
            onAddBlocker={handleAddBlockerFromMenu}
            onEditBlocker={handleEditBlockerFromMenu}
            // Pass handler for View Details
            onViewDetails={handleViewDetails}
          />
        )}

        {/* Blocker Edit/Create Modal */}
        {showBlockerModal && (
          <BlockerModal
            blockerId={currentBlockerId}
            salesOrderId={selectedSalesOrder?._id || selectedSalesOrder?.id}
            onClose={() => setShowBlockerModal(false)}
            onSave={() => {
              setShowBlockerModal(false);
              loadSalesOrders();
            }}
          />
        )}

        {/* Blocker Selection Modal (shown when multiple blockers exist) */}
        {showBlockerSelectModal && (
          <div className="blocker-select-modal-overlay" onClick={() => setShowBlockerSelectModal(false)}>
            <div className="blocker-select-modal" onClick={(e) => e.stopPropagation()}>
              <div className="blocker-select-header">
                <h3>Select Risk/Issue to Edit</h3>
                <button 
                  className="blocker-select-close"
                  onClick={() => setShowBlockerSelectModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="blocker-select-body">
                <p className="blocker-select-subtitle">
                  This Sales Order has {availableBlockers.length} associated Risk/Issues. 
                  Please select which one to edit:
                </p>
                <ul className="blocker-select-list">
                  {availableBlockers.map((blocker, index) => (
                    <li 
                      key={blocker._id}
                      className="blocker-select-item"
                      onClick={() => handleBlockerSelect(blocker._id)}
                    >
                      <div className="blocker-select-item-header">
                        <span className="blocker-select-number">{index + 1}.</span>
                        <span className="blocker-select-title">{blocker.title || 'Untitled'}</span>
                        <span className={`blocker-select-status status-${blocker.status?.toLowerCase().replace(' ', '-')}`}>
                          {blocker.status || 'Open'}
                        </span>
                      </div>
                      <div className="blocker-select-item-details">
                        <span className="blocker-select-type">{blocker.type || 'Issue'}</span>
                        {blocker.description && (
                          <span className="blocker-select-desc">
                            {blocker.description.length > 80 
                              ? blocker.description.substring(0, 80) + '...' 
                              : blocker.description}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="blocker-select-footer">
                <button 
                  className="blocker-select-cancel"
                  onClick={() => setShowBlockerSelectModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            Order Details Modal
            Shows complete order information with all blockers and action items
            Also auto-opens when navigating from "Go To Item" on Blockers page
            ================================================================ */}
        {showOrderDetailsModal && selectedSalesOrder && (
          <div className="so-modal-overlay" onClick={handleOrderDetailsClose}>
            <div className="so-order-details-modal" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="so-modal-header">
                <h3>Order Details - {selectedSalesOrder.ordernumber}</h3>
                <button className="so-modal-close-btn" onClick={handleOrderDetailsClose}>×</button>
              </div>
              
              {/* Modal Body */}
              <div className="so-modal-body">
                {/* Order Information Section */}
                <div className="so-order-info-section">
                  <h4>📦 Order Information</h4>
                  <div className="so-order-info-grid">
                    <div className="so-order-info-item">
                      <label>Order Number</label>
                      <span>{selectedSalesOrder.ordernumber || 'N/A'}</span>
                    </div>
                    <div className="so-order-info-item">
                      <label>Line Number</label>
                      <span>{selectedSalesOrder.linenumber || 'N/A'}</span>
                    </div>
                    <div className="so-order-info-item">
                      <label>Part Number</label>
                      <span>{selectedSalesOrder.partnumber || 'N/A'}</span>
                    </div>
                    <div className="so-order-info-item">
                      <label>Customer</label>
                      <span>{selectedSalesOrder.customer_name || 'N/A'}</span>
                    </div>
                    <div className="so-order-info-item">
                      <label>Quantity</label>
                      <span>{selectedSalesOrder.quantity || 'N/A'}</span>
                    </div>
                    <div className="so-order-info-item">
                      <label>Amount</label>
                      <span>{selectedSalesOrder.amount || 'N/A'}</span>
                    </div>
                    <div className="so-order-info-item">
                      <label>Shipping Date</label>
                      <span>{formatDate(selectedSalesOrder.shipping_date)}</span>
                    </div>
                    <div className="so-order-info-item">
                      <label>Shipping Status</label>
                      <span>{selectedSalesOrder.shipping_status || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Blockers Section */}
                <div className="so-blockers-section">
                  <h4>
                    ⚠️ Risks/Issues
                    {orderDetailsBlockers.length > 0 && (
                      <span className="so-blocker-count">{orderDetailsBlockers.length}</span>
                    )}
                  </h4>
                  
                  {orderDetailsLoading ? (
                    <div className="so-loading-blockers">Loading blockers...</div>
                  ) : orderDetailsBlockers.length === 0 ? (
                    <div className="so-no-blockers">
                      No risks or issues associated with this order.
                    </div>
                  ) : (
                    orderDetailsBlockers.map((blocker) => (
                      <div 
                        key={blocker._id} 
                        className={`so-blocker-card status-${blocker.status?.toLowerCase().replace(' ', '-')}`}
                      >
                        {/* Blocker Header */}
                        <div className="so-blocker-card-header">
                          <div>
                            <span className={`so-blocker-type type-${blocker.type?.toLowerCase()}`}>
                              {blocker.type || 'Issue'}
                            </span>
                            <span className="so-blocker-title">{blocker.title || 'Untitled'}</span>
                            <span className={`so-blocker-status status-${blocker.status?.toLowerCase().replace(' ', '-')}`}>
                              {blocker.status || 'Open'}
                            </span>
                          </div>
                          <button 
                            className="so-blocker-edit-btn"
                            onClick={() => handleEditBlockerFromDetails(blocker._id)}
                          >
                            ✏️ Edit
                          </button>
                        </div>

                        {/* Blocker Description */}
                        {blocker.description && (
                          <div className="so-blocker-description">
                            {blocker.description}
                          </div>
                        )}

                        {/* Blocker Meta - FIXED: Use renderAssignedTo helper */}
                        <div className="so-blocker-meta">
                          <span className="so-blocker-meta-item">
                            <strong>Priority:</strong> {blocker.priority || 'Medium'}
                          </span>
                          {blocker.assignedTo && (
                            <span className="so-blocker-meta-item">
                              <strong>Assigned:</strong> {renderAssignedTo(blocker.assignedTo)}
                            </span>
                          )}
                          {blocker.estimatedCompletionDate && (
                            <span className="so-blocker-meta-item">
                              <strong>Est. Completion:</strong> {formatDate(blocker.estimatedCompletionDate)}
                            </span>
                          )}
                        </div>

                        {/* Action Items Section */}
                        <div className="so-action-items-section">
                          <div 
                            className="so-action-items-header"
                            onClick={() => toggleActionItemsExpanded(blocker._id)}
                          >
                            <h5>
                              📋 Action Items 
                              {blocker.actionItems?.length > 0 && ` (${blocker.actionItems.length})`}
                            </h5>
                            <span className="so-action-items-toggle">
                              {expandedActionItems[blocker._id] ? '▼' : '►'}
                            </span>
                          </div>
                          
                          {expandedActionItems[blocker._id] && (
                            <div className="so-action-items-list">
                              {blocker.actionItems?.length === 0 ? (
                                <div className="so-no-action-items">No action items</div>
                              ) : (
                                blocker.actionItems.map((item, idx) => (
                                  <div key={item._id || idx} className="so-action-item">
                                    <span className="so-action-item-text">
                                      {item.actionItem || 'Unnamed action'}
                                    </span>
                                    {/* FIXED: Use renderAssignedTo helper for action items too */}
                                    {item.assignedTo && (
                                      <span className="so-action-item-assignee">
                                        → {renderAssignedTo(item.assignedTo)}
                                      </span>
                                    )}
                                    <span className={`so-action-item-status status-${item.status?.toLowerCase().replace(' ', '-')}`}>
                                      {item.status || 'Open'}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="so-modal-footer">
                <div className="so-modal-footer-left">
                  <button 
                    className="so-add-blocker-btn"
                    onClick={handleAddBlockerFromDetails}
                  >
                    + Add Risk/Issue
                  </button>
                </div>
                <button 
                  className="so-close-modal-btn"
                  onClick={handleOrderDetailsClose}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportModal && (
          <ImportModal
            onClose={() => setShowImportModal(false)}
            onImportComplete={loadSalesOrders}
          />
        )}
      </div>
    </div>
  );
};

export default SalesOrdersApp;
