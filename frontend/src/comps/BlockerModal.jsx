/**
 * =============================================================================
 * Blocker Modal Component
 * =============================================================================
 * Modal for creating and editing Blockers (Risk/Issues) for Sales Orders.
 * 
 * Features:
 * - Create new blocker with title, type, status, description, assignedTo
 * - Estimated completion date for planning
 * - Edit existing blocker
 * - Manage action items (add, edit, delete)
 * - Collapsible action items section
 * 
 * Props:
 * - blockerId: ID of existing blocker to edit (null for new)
 * - salesOrderId: ID of the related Sales Order
 * - onClose: Callback when modal is closed
 * - onSave: Callback after successful save
 * 
 * Updated: February 2, 2026 - Added estimatedCompletionDate field
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import './BlockerModal.css';

const BlockerModal = ({ blockerId, salesOrderId, onClose, onSave }) => {
  // Form data state including all fields
  const [formData, setFormData] = useState({
    title: '',
    type: 'Issue',
    status: 'Open',
    priority: 'Low',
    description: '',
    assignedTo: '',
    estimatedCompletionDate: ''
  });
  const [actionItems, setActionItems] = useState([]);
  const [isActionItemsExpanded, setIsActionItemsExpanded] = useState(false);
  const [users, setUsers] = useState([]);
  const [assignedToDisplay, setAssignedToDisplay] = useState('');

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
   * Load blocker data if editing, and load users list
   */
  useEffect(() => {
    if (blockerId) {
      loadBlockerData();
    }
    loadUsers();
  }, [blockerId]);

  /**
   * Load list of users for the assignedTo dropdown
   * Note: This endpoint requires power user access - falls back to text input for regular users
   */
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/user/company-users', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const userList = Array.isArray(data) ? data : (data.users || []);
        setUsers(userList);
      } else {
        console.log("Could not load users list - using text input instead");
        setUsers([]);
      }
    } catch (err) {
      console.error("Error loading users:", err);
      setUsers([]);
    }
  };

  /**
   * Format date for input field (YYYY-MM-DD format)
   */
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  /**
   * Load existing blocker data for editing
   */
  const loadBlockerData = async () => {
    try {
      const resBlocker = await fetch(`/api/blockers/${blockerId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const blocker = await resBlocker.json();
      
      // Handle assignedTo field (can be object or string)
      let assignedToValue = '';
      let assignedToName = '';
      
      if (blocker.assignedTo) {
        if (typeof blocker.assignedTo === 'object') {
          assignedToValue = blocker.assignedTo._id || '';
          assignedToName = blocker.assignedTo.name || blocker.assignedTo.email || '';
        } else {
          assignedToValue = blocker.assignedTo;
          assignedToName = blocker.assignedTo;
        }
      }
      
      setFormData({
        title: blocker.title || '',
        type: blocker.type || 'Issue',
        status: blocker.status || 'Open',
        priority: blocker.priority || 'Low',
        description: blocker.description || '',
        assignedTo: assignedToValue,
        estimatedCompletionDate: formatDateForInput(blocker.estimatedCompletionDate)
      });
      
      setAssignedToDisplay(assignedToName);

      // Load action items for this blocker
      const resAI = await fetch(`/api/action-items/blocker/${blockerId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const items = await resAI.json();
      setActionItems(items);
    } catch (err) {
      console.error("Error loading blocker data:", err);
      alert("Failed to load risk/issue data.");
    }
  };

  /**
   * Handle form input changes
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Add a new empty action item
   */
  const addActionItem = () => {
    setActionItems(prev => [...prev, {
      _id: `temp${Date.now()}`,
      actionItem: '',
      assignedTo: '',
      status: 'Open',
      remark: ''
    }]);
    setIsActionItemsExpanded(true);
  };

  /**
   * Update an action item field
   */
  const updateActionItem = (id, field, value) => {
    setActionItems(prev => prev.map(item => 
      item._id === id ? { ...item, [field]: value } : item
    ));
  };

  /**
   * Remove an action item
   */
  const removeActionItem = (id) => {
    setActionItems(prev => prev.filter(item => item._id !== id));
  };

  /**
   * Toggle action items section expansion
   */
  const toggleActionItems = () => {
    setIsActionItemsExpanded(!isActionItemsExpanded);
  };

  /**
   * Save the blocker and action items
   */
  const handleSubmit = async () => {
    try {
      // Build blocker data object
      const blockerData = {
        title: formData.title,
        type: formData.type,
        status: formData.status,
        priority: formData.priority,
        description: formData.description,
      };
      
      // Only include assignedTo if it has a value
      if (formData.assignedTo) {
        blockerData.assignedTo = formData.assignedTo;
      }

      // Only include estimatedCompletionDate if it has a value
      if (formData.estimatedCompletionDate) {
        blockerData.estimatedCompletionDate = formData.estimatedCompletionDate;
      }

      if (blockerId) {
        // UPDATE existing blocker
        await fetch(`/api/blockers/${blockerId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(blockerData),
        });

        // Handle action items (create new or update existing)
        for (const ai of actionItems) {
          if (ai._id.startsWith('temp')) {
            // New action item - create
            await fetch(`/api/action-items`, {
              method: "POST",
              headers: getAuthHeaders(),
              body: JSON.stringify({
                blockerId,
                actionItem: ai.actionItem,
                assignedTo: ai.assignedTo,
                status: ai.status,
                remark: ai.remark
              }),
            });
          } else {
            // Existing action item - update
            await fetch(`/api/action-items/${ai._id}`, {
              method: "PUT",
              headers: getAuthHeaders(),
              body: JSON.stringify(ai),
            });
          }
        }
      } else {
        // CREATE new blocker
        const resCreate = await fetch(`/api/blockers`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...blockerData,
            relatedSalesOrders: [salesOrderId],
          }),
        });
        const newBlocker = await resCreate.json();

        // Create action items for the new blocker
        for (const ai of actionItems) {
          await fetch(`/api/action-items`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              blockerId: newBlocker._id,
              actionItem: ai.actionItem,
              assignedTo: ai.assignedTo,
              status: ai.status,
              remark: ai.remark
            }),
          });
        }
      }

      alert("Risk/Issue saved successfully!");
      onSave();
    } catch (err) {
      console.error("Error saving:", err);
      alert("Failed to save. Check console for details.");
    }
  };

  return (
    <div className="blocker-modal-overlay">
      <div className="blocker-modal">
        {/* Modal Header */}
        <div className="blocker-modal-header">
          <h3>{blockerId ? 'Edit Risk/Issue' : 'Create Risk/Issue'}</h3>
          <button className="blocker-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Modal Body */}
        <div className="blocker-modal-body">
          {/* Title Field */}
          <div className="blocker-form-group">
            <label>Title:</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="blocker-form-input"
              placeholder="Enter blocker title"
            />
          </div>

          {/* Type, Status, and Priority Row */}
          <div className="blocker-form-row">
            <div className="blocker-form-group">
              <label>Type:</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="blocker-form-select"
              >
                <option value="Issue">Issue</option>
                <option value="Risk">Risk</option>
              </select>
            </div>

            <div className="blocker-form-group">
              <label>Status:</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="blocker-form-select"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="blocker-form-group">
              <label>Priority:</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="blocker-form-select"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          {/* Assigned To and Estimated Completion Date Row */}
          <div className="blocker-form-row">
            <div className="blocker-form-group">
              <label>Assigned To:</label>
              {users.length > 0 ? (
                <select
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleInputChange}
                  className="blocker-form-select"
                >
                  <option value="">-- Select User --</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="assignedTo"
                  value={assignedToDisplay || formData.assignedTo}
                  onChange={(e) => {
                    setAssignedToDisplay(e.target.value);
                    setFormData(prev => ({ ...prev, assignedTo: e.target.value }));
                  }}
                  className="blocker-form-input"
                  placeholder="Enter name or email"
                />
              )}
            </div>

            {/* NEW: Estimated Completion Date Field */}
            <div className="blocker-form-group">
              <label>Est. Completion Date:</label>
              <input
                type="date"
                name="estimatedCompletionDate"
                value={formData.estimatedCompletionDate}
                onChange={handleInputChange}
                className="blocker-form-input"
              />
            </div>
          </div>

          {/* Description Field */}
          <div className="blocker-form-group">
            <label>Description:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="blocker-form-textarea"
              placeholder="Enter detailed description"
            />
          </div>

          {/* Action Items Section */}
          <div className="action-items-section">
            <div 
              className={`action-items-headerr ${isActionItemsExpanded ? 'expanded' : ''}`}
              onClick={toggleActionItems}
            >
              <h4>Action Items {actionItems.length > 0 && `(${actionItems.length})`}</h4>
              <div className="action-header-controls">
                <span className="action-items-count">
                  {actionItems.filter(item => item.status === 'Completed').length}/{actionItems.length} completed
                </span>
                <span className="toggle-indicator">{isActionItemsExpanded ? '▼' : '►'}</span>
              </div>
            </div>

            {isActionItemsExpanded && (
              <div className="action-items-content">
                <button 
                  onClick={addActionItem}
                  className="add-action-button"
                >
                  + Add Action Item
                </button>
                
                {actionItems.length > 0 ? (
                  <table className="action-items-table">
                    <thead>
                      <tr>
                        <th>Action Item</th>
                        <th>Assigned To</th>
                        <th>Status</th>
                        <th>Remark</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionItems.map((item) => (
                        <tr key={item._id}>
                          <td>
                            <input
                              type="text"
                              value={item.actionItem}
                              onChange={(e) => updateActionItem(item._id, 'actionItem', e.target.value)}
                              className="action-item-input"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={item.assignedTo}
                              onChange={(e) => updateActionItem(item._id, 'assignedTo', e.target.value)}
                              className="action-item-input"
                            />
                          </td>
                          <td>
                            <select
                              value={item.status}
                              onChange={(e) => updateActionItem(item._id, 'status', e.target.value)}
                              className="action-item-select"
                            >
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              value={item.remark}
                              onChange={(e) => updateActionItem(item._id, 'remark', e.target.value)}
                              className="action-item-input"
                            />
                          </td>
                          <td>
                            <button
                              onClick={() => removeActionItem(item._id)}
                              className="remove-action-button"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-action-items">No action items added yet.</div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="blocker-modal-footer">
            <button onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button onClick={handleSubmit} className="save-button">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockerModal;
