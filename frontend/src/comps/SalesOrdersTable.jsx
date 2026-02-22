/**
 * =============================================================================
 * SalesOrdersTable Component
 * =============================================================================
 * Displays sales orders in a filterable table with row selection and 3-dot menu.
 * 
 * Updated: February 3, 2026
 * Change: Added "View Details" option to 3-dot menu (opens Order Details modal)
 * 
 * Previous Update: February 3, 2026
 * Change: Added 3-dot menu column with "Add Blocker" and "Edit Blocker" options
 * =============================================================================
 */

import React, { useState } from 'react';
import './SalesOrdersTable.css';

const SalesOrdersTable = ({ 
  salesOrders, 
  selectedSalesOrder, 
  onSelectSalesOrder,
  onUpdateSalesOrders,
  // Handler props for blocker actions from parent component
  onAddBlocker,       // Called when "Add Blocker" is clicked
  onEditBlocker,      // Called when "Edit Blocker" is clicked
  // NEW: Handler for View Details - opens Order Details modal
  onViewDetails       // Called when "View Details" is clicked
}) => {
  // Filter state for each searchable column
  const [filters, setFilters] = useState({
    orderNumber: '',
    partNumber: '',
    customerName: '',
    shippingStatus: ''
  });

  // Track which row is being edited (inline edit mode)
  const [editingRow, setEditingRow] = useState(null);
  
  // Track which row's 3-dot menu is open (only one at a time)
  const [openMenuId, setOpenMenuId] = useState(null);

  /**
   * Update filter state when user types in filter inputs
   */
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value.toLowerCase()
    }));
  };

  /**
   * Filter sales orders based on current filter values
   */
  const filteredOrders = salesOrders.filter(order => {
    return (
      order.ordernumber.toLowerCase().includes(filters.orderNumber) &&
      order.partnumber.toLowerCase().includes(filters.partNumber) &&
      order.customer_name.toLowerCase().includes(filters.customerName) &&
      order.shipping_status.toLowerCase().includes(filters.shippingStatus)
    );
  });

  /**
   * Handle row click to select the sales order
   */
  const handleRowClick = (order) => {
    if (editingRow !== order.ordernumber) {
      onSelectSalesOrder(order);
      // Close any open menu when clicking a row
      setOpenMenuId(null);
    }
  };

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
   * Toggle inline edit mode for a row
   */
  const toggleEdit = async (order) => {
    if (editingRow === order.ordernumber) {
      try {
        const response = await fetch(`/api/salesorders`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ordernumber: order.ordernumber,
            linenumber: order.linenumber,
            blockerTag: order.blockerTag,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save sales order");
        }

        alert("Sales order saved successfully.");
        setEditingRow(null);
        onUpdateSalesOrders();
      } catch (error) {
        console.error("Error saving sales order:", error);
        alert("Error saving changes");
      }
    } else {
      setEditingRow(order.ordernumber);
    }
  };

  /**
   * Toggle the 3-dot menu for a specific row
   * @param {Event} e - Click event
   * @param {string} orderId - Unique identifier for the row
   */
  const toggleMenu = (e, orderId) => {
    e.stopPropagation(); // Prevent row selection when clicking menu
    setOpenMenuId(openMenuId === orderId ? null : orderId);
  };

  /**
   * Handle "Add Blocker" menu option click
   * @param {Event} e - Click event
   * @param {Object} order - The sales order object
   */
  const handleAddBlockerClick = (e, order) => {
    e.stopPropagation();
    setOpenMenuId(null); // Close menu
    // Select the order first, then trigger add blocker
    onSelectSalesOrder(order);
    if (onAddBlocker) {
      onAddBlocker(order);
    }
  };

  /**
   * Handle "Edit Blocker" menu option click
   * @param {Event} e - Click event
   * @param {Object} order - The sales order object
   */
  const handleEditBlockerClick = (e, order) => {
    e.stopPropagation();
    setOpenMenuId(null); // Close menu
    // Select the order first, then trigger edit blocker
    onSelectSalesOrder(order);
    if (onEditBlocker) {
      onEditBlocker(order);
    }
  };

  /**
   * NEW: Handle "View Details" menu option click
   * Opens the Order Details modal showing all order info with blockers
   * @param {Event} e - Click event
   * @param {Object} order - The sales order object
   */
  const handleViewDetailsClick = (e, order) => {
    e.stopPropagation();
    setOpenMenuId(null); // Close menu
    // Select the order first, then trigger view details modal
    onSelectSalesOrder(order);
    if (onViewDetails) {
      onViewDetails(order);
    }
  };

  /**
   * Close menu when clicking outside
   * This is handled by clicking on the table or overlay
   */
  const closeMenu = () => {
    setOpenMenuId(null);
  };

  return (
    <div className="sales-table-container" onClick={closeMenu}>
      <table className="sales-table">
        <thead>
          <tr>
            {/* 3-dot menu column header */}
            <th className="menu-column">Actions</th>
            <th className="edit-column">Edit</th>
            <th>
              Order Number
              <input
                type="text"
                className="table-filter"
                placeholder="Search Order #"
                value={filters.orderNumber}
                onChange={(e) => handleFilterChange('orderNumber', e.target.value)}
              />
            </th>
            <th>Line Number</th>
            <th>
              Part Number
              <input
                type="text"
                className="table-filter"
                placeholder="Search Part #"
                value={filters.partNumber}
                onChange={(e) => handleFilterChange('partNumber', e.target.value)}
              />
            </th>
            <th>Quantity</th>
            <th>Amount</th>
            <th>
              Customer Name
              <input
                type="text"
                className="table-filter"
                placeholder="Search Customer"
                value={filters.customerName}
                onChange={(e) => handleFilterChange('customerName', e.target.value)}
              />
            </th>
            <th>Shipping Date</th>
            <th>
              Shipping Status
              <input
                type="text"
                className="table-filter"
                placeholder="Search Status"
                value={filters.shippingStatus}
                onChange={(e) => handleFilterChange('shippingStatus', e.target.value)}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((order) => {
            // Create unique ID for menu tracking
            const rowId = `${order.ordernumber}-${order.linenumber}`;
            // Check if this order has blockers (blockerTag > 0)
            const hasBlockers = order.blockerTag > 0;
            
            return (
              <tr
                key={rowId}
                onClick={() => handleRowClick(order)}
                className={`
                  table-row
                  ${selectedSalesOrder?.ordernumber === order.ordernumber ? 'row-selected' : ''}
                  ${hasBlockers ? 'row-has-blocker' : ''}
                `}
              >
                {/* 3-dot menu cell */}
                <td className="menu-cell">
                  <div className="menu-wrapper">
                    <button
                      className="menu-button"
                      onClick={(e) => toggleMenu(e, rowId)}
                      title="Actions"
                    >
                      ⋮
                    </button>
                    
                    {/* Dropdown menu - only shown when this row's menu is open */}
                    {openMenuId === rowId && (
                      <div className="menu-dropdown">
                        {/* NEW: View Details - ALWAYS visible at top */}
                        <button
                          className="menu-item"
                          onClick={(e) => handleViewDetailsClick(e, order)}
                        >
                          👁️ View Details
                        </button>
                        
                        {/* Add Blocker - ALWAYS visible */}
                        <button
                          className="menu-item"
                          onClick={(e) => handleAddBlockerClick(e, order)}
                        >
                          ➕ Add Blocker
                        </button>
                        
                        {/* Edit Blocker - only visible if order has blockers */}
                        {hasBlockers && (
                          <button
                            className="menu-item"
                            onClick={(e) => handleEditBlockerClick(e, order)}
                          >
                            ✏️ Edit Blocker
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>

                {/* Existing edit button cell */}
                <td className="edit-cell">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEdit(order);
                    }}
                    className="edit-button"
                  >
                    {editingRow === order.ordernumber ? '💾' : '✏️'}
                  </button>
                </td>
                <td>{order.ordernumber}</td>
                <td>{order.linenumber}</td>
                <td>{order.partnumber}</td>
                <td>{order.quantity}</td>
                <td>{order.amount}</td>
                <td>{order.customer_name}</td>
                <td>{order.shipping_date}</td>
                <td>
                  {editingRow === order.ordernumber ? (
                    <select
                      value={order.shipping_status}
                      onChange={(e) => {
                        const newOrders = [...salesOrders];
                        const idx = newOrders.findIndex(o => o.ordernumber === order.ordernumber);
                        newOrders[idx] = { ...order, shipping_status: e.target.value };
                        onUpdateSalesOrders(newOrders);
                      }}
                      className="status-select"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  ) : (
                    order.shipping_status
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SalesOrdersTable;
