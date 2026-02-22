/**
 * =============================================================================
 * Calendar View Page
 * =============================================================================
 * Weekly calendar display for Sales Orders and Work Orders.
 * 
 * Features:
 * - Toggle between Sales Orders and Work Orders via dropdown
 * - Navigate between weeks using arrow buttons
 * - Orders displayed as sticky notes on their respective dates
 * - Blocked orders (linked to open Blockers) shown with red background
 * - Non-blocked orders shown with yellow sticky note style
 * - Click on order to view Order Details (with ALL blockers and action items)
 * - 3-dot menu for: Edit Status, Add Blocker (always), Edit Blocker (if exists)
 * 
 * API Endpoints Used:
 * - GET  /api/calendar?type=salesorders|workorders&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * - PUT  /api/calendar/status
 * 
 * Created: January 12, 2026
 * Updated: February 3, 2026 - Added "Add Blocker" always visible in 3-dot menu
 *                           - Added Edit button on each blocker card in Order Details
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import Navbar from '../comps/NavBar';
import BlockerModal from '../comps/BlockerModal';
import './calendarView.css';

const CalendarView = () => {
  // ===== State Variables =====
  const [orderType, setOrderType] = useState('salesorders');
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [partNumberFilter, setPartNumberFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  
  // Modal states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [showBlockerSelectModal, setShowBlockerSelectModal] = useState(false);
  
  // Menu and editing states
  const [showBlockerMenu, setShowBlockerMenu] = useState(null);
  const [editingBlockerId, setEditingBlockerId] = useState(null);

  /**
   * Get Monday of the week for a given date
   */
  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  /**
   * Format date as YYYY-MM-DD for API calls
   */
  function formatDateForAPI(date) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format date for display (e.g., "Mon 12")
   */
  function formatDateForDisplay(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[date.getDay()]} ${date.getDate()}`;
  }

  /**
   * Get authentication headers for API requests
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
   * Generate array of 7 days starting from currentWeekStart
   */
  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  /**
   * Load orders from API when week or order type changes
   */
  useEffect(() => {
    loadOrders();
    document.title = 'Calendar View';
  }, [currentWeekStart, orderType]);

  /**
   * Apply filters whenever orders or filter values change
   */
  useEffect(() => {
    applyFilters();
  }, [orders, statusFilter, partNumberFilter, customerFilter]);

  /**
   * Close blocker menu when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = () => setShowBlockerMenu(null);
    if (showBlockerMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showBlockerMenu]);

  /**
   * Fetch orders from the calendar API endpoint
   */
  const loadOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const startDate = formatDateForAPI(currentWeekStart);
      const endDate = formatDateForAPI(new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000));

      const response = await fetch(
        `/api/calendar?type=${orderType}&startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch calendar orders');
      }

      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading calendar orders:', error);
      setError(error.message);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Apply filters to orders
   */
  const applyFilters = () => {
    let filtered = [...orders];

    if (statusFilter) {
      filtered = filtered.filter(order => {
        const orderStatus = orderType === 'salesorders' 
          ? (order.shipping_status || order.order_status || '')
          : (order.status || '');
        return orderStatus.toLowerCase() === statusFilter.toLowerCase();
      });
    }

    if (partNumberFilter) {
      filtered = filtered.filter(order => 
        (order.partnumber || '').toLowerCase().includes(partNumberFilter.toLowerCase())
      );
    }

    if (customerFilter) {
      filtered = filtered.filter(order => {
        if (orderType === 'salesorders') {
          return (order.customer_name || '').toLowerCase().includes(customerFilter.toLowerCase());
        } else {
          return (order.description || '').toLowerCase().includes(customerFilter.toLowerCase()) ||
                 (order.salesorder || '').toLowerCase().includes(customerFilter.toLowerCase());
        }
      });
    }

    setFilteredOrders(filtered);
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setStatusFilter('');
    setPartNumberFilter('');
    setCustomerFilter('');
  };

  /**
   * Get status options for filter dropdown based on order type
   */
  const getFilterStatusOptions = () => {
    if (orderType === 'salesorders') {
      return ['Pending', 'Processing', 'In Transit', 'Shipped', 'Delivered', 'Cancelled'];
    } else {
      return ['Open', 'In-progress', 'Completed', 'Closed'];
    }
  };

  /**
   * Navigate to previous week
   */
  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  /**
   * Navigate to next week
   */
  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  /**
   * Navigate to current week
   */
  const goToToday = () => {
    setCurrentWeekStart(getMonday(new Date()));
  };

  /**
   * Get orders for a specific day
   */
  const getOrdersForDay = (day) => {
    const targetYear = day.getFullYear();
    const targetMonth = day.getMonth();
    const targetDate = day.getDate();

    return filteredOrders.filter(order => {
      if (!order.calendarDate) return false;
      
      const orderDate = new Date(order.calendarDate);
      const orderYear = orderDate.getUTCFullYear();
      const orderMonth = orderDate.getUTCMonth();
      const orderDay = orderDate.getUTCDate();

      return orderYear === targetYear && 
             orderMonth === targetMonth && 
             orderDay === targetDate;
    });
  };

  /**
   * Handle click on an order sticky note - Opens Order Details modal
   */
  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowOrderDetailsModal(true);
  };

  /**
   * Handle 3-dot menu click
   */
  const handleMenuClick = (e, orderId) => {
    e.stopPropagation();
    setShowBlockerMenu(showBlockerMenu === orderId ? null : orderId);
  };

  /**
   * Handle "Edit Status" from 3-dot menu
   */
  const handleEditStatusClick = (e, order) => {
    e.stopPropagation();
    setSelectedOrder(order);
    setShowBlockerMenu(null);
    setShowStatusModal(true);
  };

  /**
   * Handle blocker action (add or edit) from 3-dot menu
   */
  const handleBlockerAction = (action, order) => {
    setSelectedOrder(order);
    setShowBlockerMenu(null);
    
    if (action === 'add') {
      // Adding new blocker - open blocker modal directly
      setEditingBlockerId(null);
      setShowBlockerModal(true);
    } else if (action === 'edit') {
      // Editing blocker - check if multiple blockers exist
      const blockers = order.blockers || [];
      if (blockers.length === 0) {
        alert('No blockers found for this order.');
      } else if (blockers.length === 1) {
        // Single blocker - edit directly
        setEditingBlockerId(blockers[0]._id);
        setShowBlockerModal(true);
      } else {
        // Multiple blockers - show selection modal
        setShowBlockerSelectModal(true);
      }
    }
  };

  /**
   * Handle blocker selection from the selection modal
   */
  const handleBlockerSelect = (blockerId) => {
    setEditingBlockerId(blockerId);
    setShowBlockerSelectModal(false);
    setShowBlockerModal(true);
  };

  /**
   * Handle blocker modal save - refresh orders
   */
  const handleBlockerSave = () => {
    setShowBlockerModal(false);
    setSelectedOrder(null);
    setEditingBlockerId(null);
    loadOrders();
  };

  /**
   * Handle blocker modal close
   */
  const handleBlockerClose = () => {
    setShowBlockerModal(false);
    setSelectedOrder(null);
    setEditingBlockerId(null);
  };

  /**
   * Close Order Details modal
   */
  const handleOrderDetailsClose = () => {
    setShowOrderDetailsModal(false);
    setSelectedOrder(null);
  };

  /**
   * NEW: Handle edit button click on a specific blocker card in Order Details modal
   * @param {string} blockerId - The ID of the blocker to edit
   */
  const handleEditBlockerFromDetails = (blockerId) => {
    setEditingBlockerId(blockerId);
    setShowOrderDetailsModal(false);
    setShowBlockerModal(true);
  };

  /**
   * Update order status via API
   */
  const updateOrderStatus = async (newStatus) => {
    if (!selectedOrder) return;

    try {
      const response = await fetch('/api/calendar/status', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: orderType,
          orderId: selectedOrder._id,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      await loadOrders();
      setShowStatusModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status: ' + error.message);
    }
  };

  /**
   * Get display name for an order (order number)
   */
  const getOrderDisplayName = (order) => {
    if (orderType === 'salesorders') {
      return order.ordernumber || 'N/A';
    } else {
      return order.workorder || 'N/A';
    }
  };

  /**
   * Get current status of an order
   */
  const getOrderStatus = (order) => {
    if (orderType === 'salesorders') {
      return order.shipping_status || order.order_status || 'N/A';
    } else {
      return order.status || 'N/A';
    }
  };

  /**
   * Get status options based on order type
   */
  const getStatusOptions = () => {
    if (orderType === 'salesorders') {
      return ['Pending', 'Processing', 'In Transit', 'Shipped', 'Delivered', 'Cancelled'];
    } else {
      return ['Open', 'In-progress', 'Completed', 'Closed'];
    }
  };

  /**
   * Get week range string for header display
   */
  const getWeekRangeString = () => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${currentWeekStart.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  };

  /**
   * Format currency
   */
  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  /**
   * Get action item status color
   */
  const getActionItemStatusColor = (status) => {
    switch (status) {
      case 'Completed': return '#28a745';
      case 'In Progress': return '#ffc107';
      case 'Open': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // ===== Render =====
  return (
    <div className="app-container">
      <Navbar />
      <div className="content-container">
        <h2>CALENDAR VIEW</h2>

        {/* Controls Section */}
        <div className="calendar-controls">
          <div className="calendar-type-selector">
            <label htmlFor="orderType">Show: </label>
            <select
              id="orderType"
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="calendar-dropdown"
            >
              <option value="salesorders">Sales Orders</option>
              <option value="workorders">Work Orders</option>
            </select>
          </div>

          <div className="calendar-navigation">
            <button onClick={goToPreviousWeek} className="nav-button">
              ← Previous
            </button>
            <button onClick={goToToday} className="nav-button today-button">
              Today
            </button>
            <button onClick={goToNextWeek} className="nav-button">
              Next →
            </button>
          </div>

          <div className="calendar-week-range">
            {getWeekRangeString()}
          </div>
        </div>

        {/* Filter Section */}
        <div className="calendar-filters">
          <div className="filter-group">
            <label htmlFor="statusFilter">
              {orderType === 'salesorders' ? 'Shipping Status' : 'Order Status'}
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              {getFilterStatusOptions().map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="partNumberFilter">Search by Part Number</label>
            <input
              type="text"
              id="partNumberFilter"
              value={partNumberFilter}
              onChange={(e) => setPartNumberFilter(e.target.value)}
              placeholder="Search Part #"
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="customerFilter">
              {orderType === 'salesorders' ? 'Search by Customer' : 'Search by Description'}
            </label>
            <input
              type="text"
              id="customerFilter"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              placeholder={orderType === 'salesorders' ? 'Search Customer' : 'Search Description'}
              className="filter-input"
            />
          </div>

          {(statusFilter || partNumberFilter || customerFilter) && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              ✕ Clear Filters
            </button>
          )}

          <div className="filter-results-count">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            Error loading calendar: {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="loading-message">Loading calendar...</div>
        ) : (
          <div className="calendar-grid">
            {getWeekDays().map((day, index) => (
              <div key={index} className="calendar-day">
                <div className={`day-header ${day.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
                  {formatDateForDisplay(day)}
                </div>

                <div className="day-orders">
                  {getOrdersForDay(day).map((order) => (
                    <div
                      key={order._id}
                      className={`order-sticky ${order.isBlocked ? 'blocked' : 'normal'}`}
                      onClick={() => handleOrderClick(order)}
                      title="Click to view order details"
                    >
                      {/* Order Header with 3-dot menu */}
                      <div className="order-header">
                        <span className="order-number">Order: {getOrderDisplayName(order)}</span>
                        <div className="order-actions">
                          {order.isBlocked && <span className="blocker-icon">⚠</span>}
                          <button 
                            className="menu-button"
                            onClick={(e) => handleMenuClick(e, order._id)}
                            title="More options"
                          >
                            ⋮
                          </button>
                          {/* 3-Dot Dropdown Menu - UPDATED Feb 3, 2026 */}
                          {showBlockerMenu === order._id && (
                            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                              {/* Edit Status Option */}
                              <button 
                                className="dropdown-item"
                                onClick={(e) => handleEditStatusClick(e, order)}
                              >
                                📝 Edit Status
                              </button>
                              
                              {/* ========================================
                                  UPDATED: Add Blocker - ALWAYS visible
                                  ======================================== */}
                              <button 
                                className="dropdown-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBlockerAction('add', order);
                                }}
                              >
                                ➕ Add Blocker
                              </button>
                              
                              {/* Edit Blocker - Only visible if order has blockers */}
                              {order.isBlocked && (
                                <button 
                                  className="dropdown-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBlockerAction('edit', order);
                                  }}
                                >
                                  ✏️ Edit Blocker {order.blockers?.length > 1 ? `(${order.blockers.length})` : ''}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Order Details - Sales Orders */}
                      {orderType === 'salesorders' && (
                        <div className="order-details">
                          <div className="detail-row">
                            <span className="detail-label">Part Number:</span>
                            <span className="detail-value">{order.partnumber || 'N/A'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Line Number:</span>
                            <span className="detail-value">{order.linenumber || 'N/A'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Customer Name:</span>
                            <span className="detail-value">{order.customer_name || 'N/A'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Quantity:</span>
                            <span className="detail-value">{order.quantity || 'N/A'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Amount:</span>
                            <span className="detail-value">{formatCurrency(order.amount)}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Order Status:</span>
                            <span className="detail-value">{order.order_status || 'N/A'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Shipping Status:</span>
                            <span className="detail-value">{order.shipping_status || 'N/A'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Order Date:</span>
                            <span className="detail-value">{formatDate(order.order_date)}</span>
                          </div>
                        </div>
                      )}

                      {/* Order Details - Work Orders */}
                      {orderType === 'workorders' && (
                        <div className="order-details">
                          <div className="detail-row">
                            <span className="detail-label">Type:</span>
                            <span className="detail-value">{order.type || 'N/A'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Part Number:</span>
                            <span className="detail-value">{order.partnumber || 'N/A'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Priority:</span>
                            <span className="detail-value">{order.priority || 'N/A'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Status:</span>
                            <span className="detail-value">{order.status || 'N/A'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Quantity:</span>
                            <span className="detail-value">{order.quantity || 'N/A'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Est. Cost:</span>
                            <span className="detail-value">{formatCurrency(order.estCost)}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Sales Order:</span>
                            <span className="detail-value">{order.salesorder || 'N/A'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Description:</span>
                            <span className="detail-value">{order.description || 'N/A'}</span>
                          </div>
                        </div>
                      )}

                      {/* Blocker Indicator */}
                      {order.isBlocked && (
                        <div className="blocker-indicator">
                          ⚠ Blocked ({order.blockers?.length || 1} {order.blockers?.length === 1 ? 'blocker' : 'blockers'})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color normal"></div>
            <span>Normal Order</span>
          </div>
          <div className="legend-item">
            <div className="legend-color blocked"></div>
            <span>Blocked Order (Has Open Risk/Issue)</span>
          </div>
        </div>

        {/* ============================================================
            ORDER DETAILS MODAL
            Shows all order information with ALL blockers and action items
            UPDATED: Feb 3, 2026 - Added Edit button on each blocker card
            ============================================================ */}
        {showOrderDetailsModal && selectedOrder && (
          <div className="modal-overlay" onClick={handleOrderDetailsClose}>
            <div className="order-details-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Order Details</h3>
                <button className="modal-close-btn" onClick={handleOrderDetailsClose}>×</button>
              </div>
              
              <div className="modal-body">
                {/* Order Information Section */}
                <div className="order-info-section">
                  <h4>📦 Order Information</h4>
                  <div className="order-info-grid">
                    <div className="info-item">
                      <span className="info-label">Order Number:</span>
                      <span className="info-value">{getOrderDisplayName(selectedOrder)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Current Status:</span>
                      <span className="info-value">{getOrderStatus(selectedOrder)}</span>
                    </div>
                    
                    {/* Sales Order specific fields */}
                    {orderType === 'salesorders' && (
                      <>
                        <div className="info-item">
                          <span className="info-label">Part Number:</span>
                          <span className="info-value">{selectedOrder.partnumber || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Line Number:</span>
                          <span className="info-value">{selectedOrder.linenumber || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Customer Name:</span>
                          <span className="info-value">{selectedOrder.customer_name || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Quantity:</span>
                          <span className="info-value">{selectedOrder.quantity || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Amount:</span>
                          <span className="info-value">{formatCurrency(selectedOrder.amount)}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Order Status:</span>
                          <span className="info-value">{selectedOrder.order_status || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Shipping Status:</span>
                          <span className="info-value">{selectedOrder.shipping_status || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Shipping Date:</span>
                          <span className="info-value">{formatDate(selectedOrder.shipping_date)}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Due Date:</span>
                          <span className="info-value">{formatDate(selectedOrder.dueDate)}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Location:</span>
                          <span className="info-value">{selectedOrder.location || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Program:</span>
                          <span className="info-value">{selectedOrder.program || 'N/A'}</span>
                        </div>
                      </>
                    )}
                    
                    {/* Work Order specific fields */}
                    {orderType === 'workorders' && (
                      <>
                        <div className="info-item">
                          <span className="info-label">Type:</span>
                          <span className="info-value">{selectedOrder.type || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Part Number:</span>
                          <span className="info-value">{selectedOrder.partnumber || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Priority:</span>
                          <span className="info-value">{selectedOrder.priority || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Quantity:</span>
                          <span className="info-value">{selectedOrder.quantity || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Est. Cost:</span>
                          <span className="info-value">{formatCurrency(selectedOrder.estCost)}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Actual Cost:</span>
                          <span className="info-value">{formatCurrency(selectedOrder.actualCost)}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Sales Order:</span>
                          <span className="info-value">{selectedOrder.salesorder || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Due Date:</span>
                          <span className="info-value">{formatDate(selectedOrder.dueDate)}</span>
                        </div>
                        <div className="info-item full-width">
                          <span className="info-label">Description:</span>
                          <span className="info-value">{selectedOrder.description || 'N/A'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Blockers Section - Shows ALL blockers with action items */}
                <div className="blockers-section">
                  <h4>⚠️ Blockers ({selectedOrder.blockers?.length || 0})</h4>
                  
                  {(!selectedOrder.blockers || selectedOrder.blockers.length === 0) ? (
                    <div className="no-blockers">
                      <p>✅ No active blockers for this order.</p>
                    </div>
                  ) : (
                    <div className="blockers-list">
                      {selectedOrder.blockers.map((blocker, index) => (
                        <div key={blocker._id} className="blocker-card">
                          {/* UPDATED: Blocker header with Edit button */}
                          <div className="blocker-header">
                            <span className="blocker-number">Blocker #{index + 1}</span>
                            <span className={`blocker-type ${blocker.type?.toLowerCase()}`}>
                              {blocker.type || 'Issue'}
                            </span>
                            <span className={`blocker-status ${blocker.status?.toLowerCase().replace(' ', '-')}`}>
                              {blocker.status || 'Open'}
                            </span>
                            {/* NEW: Edit button for this specific blocker */}
                            <button 
                              className="blocker-edit-btn"
                              onClick={() => handleEditBlockerFromDetails(blocker._id)}
                              title="Edit this blocker"
                            >
                              ✏️ Edit
                            </button>
                          </div>
                          
                          <div className="blocker-content">
                            <div className="blocker-title">{blocker.title || 'Untitled'}</div>
                            {blocker.description && (
                              <div className="blocker-description">{blocker.description}</div>
                            )}
                            <div className="blocker-assigned">
                              <strong>Assigned To:</strong> {blocker.assignedTo?.name || blocker.assignedTo?.email || 'Unassigned'}
                            </div>
                          </div>

                          {/* Action Items for this blocker */}
                          <div className="action-items-section">
                            <div className="action-items-header">
                              <strong>Action Items ({blocker.actionItems?.length || 0})</strong>
                            </div>
                            
                            {(!blocker.actionItems || blocker.actionItems.length === 0) ? (
                              <div className="no-action-items">No action items</div>
                            ) : (
                              <div className="action-items-list">
                                {blocker.actionItems.map((item, itemIndex) => (
                                  <div key={item._id} className="action-item">
                                    <div className="action-item-row">
                                      <span 
                                        className="action-status-dot"
                                        style={{ backgroundColor: getActionItemStatusColor(item.status) }}
                                        title={item.status}
                                      ></span>
                                      <span className="action-item-text">{item.actionItem}</span>
                                      <span className="action-item-assignee">{item.assignedTo || 'Unassigned'}</span>
                                      <span className={`action-item-status ${item.status?.toLowerCase().replace(' ', '-')}`}>
                                        {item.status}
                                      </span>
                                    </div>
                                    {item.remark && (
                                      <div className="action-item-remark">
                                        <em>Remark: {item.remark}</em>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={handleOrderDetailsClose}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            EDIT STATUS MODAL
            Accessed via 3-dot menu -> Edit Status
            ============================================================ */}
        {showStatusModal && selectedOrder && (
          <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
            <div className="status-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Edit Status</h3>
              <p><strong>Order:</strong> {getOrderDisplayName(selectedOrder)}</p>
              <p><strong>Current Status:</strong> {getOrderStatus(selectedOrder)}</p>

              <div className="status-buttons">
                {getStatusOptions().map((status) => (
                  <button
                    key={status}
                    className={`status-button ${getOrderStatus(selectedOrder) === status ? 'current' : ''}`}
                    onClick={() => updateOrderStatus(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <button className="close-button" onClick={() => setShowStatusModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
            BLOCKER SELECTION MODAL
            When order has multiple blockers, let user choose which to edit
            ============================================================ */}
        {showBlockerSelectModal && selectedOrder && (
          <div className="modal-overlay" onClick={() => setShowBlockerSelectModal(false)}>
            <div className="blocker-select-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Select Blocker to Edit</h3>
              <p>This order has {selectedOrder.blockers?.length} blockers. Select one to edit:</p>
              
              <div className="blocker-select-list">
                {selectedOrder.blockers?.map((blocker, index) => (
                  <button
                    key={blocker._id}
                    className="blocker-select-item"
                    onClick={() => handleBlockerSelect(blocker._id)}
                  >
                    <span className="blocker-select-number">#{index + 1}</span>
                    <span className="blocker-select-title">{blocker.title || 'Untitled'}</span>
                    <span className={`blocker-select-type ${blocker.type?.toLowerCase()}`}>
                      {blocker.type}
                    </span>
                    <span className={`blocker-select-status ${blocker.status?.toLowerCase().replace(' ', '-')}`}>
                      {blocker.status}
                    </span>
                  </button>
                ))}
              </div>

              <button className="close-button" onClick={() => setShowBlockerSelectModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Blocker Modal for Sales Orders */}
        {showBlockerModal && selectedOrder && orderType === 'salesorders' && (
          <BlockerModal
            blockerId={editingBlockerId}
            salesOrderId={selectedOrder._id}
            onClose={handleBlockerClose}
            onSave={handleBlockerSave}
          />
        )}

        {/* For Work Orders, show a redirect modal */}
        {showBlockerModal && selectedOrder && orderType === 'workorders' && (
          <div className="modal-overlay" onClick={handleBlockerClose}>
            <div className="status-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{editingBlockerId ? 'Edit Blocker' : 'Add Blocker'}</h3>
              <p>To {editingBlockerId ? 'edit' : 'add'} a blocker for Work Order <strong>{selectedOrder.workorder}</strong>, please use the Work Orders page.</p>
              <div className="status-buttons">
                <button 
                  className="status-button current"
                  onClick={() => window.location.href = '/app/workorders'}
                >
                  Go to Work Orders
                </button>
              </div>
              <button className="close-button" onClick={handleBlockerClose}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
