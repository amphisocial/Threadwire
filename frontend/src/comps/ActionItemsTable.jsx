/**
 * =============================================================================
 * Action Items Table Component
 * =============================================================================
 * Displays and manages action items for a selected blocker.
 * 
 * Features:
 * - View all action items for selected blocker
 * - Edit action items inline with Save/Cancel buttons
 * - Delete action items with confirmation
 * - Add new action items
 * - Status dropdown (Open, In Progress, Completed)
 * 
 * Props:
 * - actionItems: Array of action item objects
 * - onActionUpdate: Callback to update an action item
 * - onActionDelete: Callback to delete an action item
 * - onActionCreate: Callback to create a new action item
 * - blockerId: ID of the selected blocker (needed for creating new items)
 * 
 * Updated: January 22, 2026 - Added Save/Delete buttons, Add New functionality
 * =============================================================================
 */

import React, { useState } from 'react';

const ActionItemsTable = ({ 
  actionItems, 
  onActionUpdate, 
  onActionDelete, 
  onActionCreate,
  blockerId 
}) => {
  // Track which row is being edited
  const [editingRow, setEditingRow] = useState(null);
  // Store edited values temporarily
  const [editedData, setEditedData] = useState({});
  // Track if we're adding a new item
  const [isAddingNew, setIsAddingNew] = useState(false);
  // New item data
  const [newItem, setNewItem] = useState({
    actionItem: '',
    assignedTo: '',
    status: 'Open',
    remark: ''
  });

  /**
   * Start editing a row
   */
  const startEdit = (actionItem) => {
    setEditingRow(actionItem._id);
    setEditedData({
      actionItem: actionItem.actionItem || '',
      assignedTo: actionItem.assignedTo || '',
      status: actionItem.status || 'Open',
      remark: actionItem.remark || ''
    });
  };

  /**
   * Cancel editing
   */
  const cancelEdit = () => {
    setEditingRow(null);
    setEditedData({});
  };

  /**
   * Save edited data
   */
  const saveEdit = (actionItem) => {
    onActionUpdate(actionItem._id, editedData);
    setEditingRow(null);
    setEditedData({});
  };

  /**
   * Handle input change during edit
   */
  const handleEditChange = (field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Handle delete with confirmation
   */
  const handleDelete = (actionItem) => {
    if (window.confirm(`Are you sure you want to delete this action item?\n\n"${actionItem.actionItem}"`)) {
      if (onActionDelete) {
        onActionDelete(actionItem._id);
      }
    }
  };

  /**
   * Handle new item input change
   */
  const handleNewItemChange = (field, value) => {
    setNewItem(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Save new action item
   */
  const saveNewItem = () => {
    if (!newItem.actionItem.trim()) {
      alert('Please enter an action item description');
      return;
    }
    if (onActionCreate) {
      onActionCreate(newItem);
    }
    // Reset form
    setNewItem({
      actionItem: '',
      assignedTo: '',
      status: 'Open',
      remark: ''
    });
    setIsAddingNew(false);
  };

  /**
   * Cancel adding new item
   */
  const cancelNewItem = () => {
    setNewItem({
      actionItem: '',
      assignedTo: '',
      status: 'Open',
      remark: ''
    });
    setIsAddingNew(false);
  };

  return (
    <div className="table-container">
      {/* Add New Button - only show if blockerId exists */}
      {blockerId && (
        <div style={{ marginBottom: '10px' }}>
          <button
            onClick={() => setIsAddingNew(true)}
            className="btn btn-success"
            disabled={isAddingNew}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            + Add Action Item
          </button>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th style={{ width: '100px' }}>Actions</th>
            <th>Action Item</th>
            <th>Assigned To</th>
            <th>Status</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {/* New Item Row */}
          {isAddingNew && (
            <tr style={{ backgroundColor: '#e8f5e9' }}>
              <td>
                <button
                  onClick={saveNewItem}
                  className="edit-button"
                  title="Save"
                  style={{ marginRight: '5px' }}
                >
                  💾
                </button>
                <button
                  onClick={cancelNewItem}
                  className="edit-button"
                  title="Cancel"
                >
                  ❌
                </button>
              </td>
              <td>
                <input
                  type="text"
                  value={newItem.actionItem}
                  onChange={(e) => handleNewItemChange('actionItem', e.target.value)}
                  className="edit-input"
                  placeholder="Enter action item..."
                  autoFocus
                  style={{ width: '100%', padding: '6px' }}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={newItem.assignedTo}
                  onChange={(e) => handleNewItemChange('assignedTo', e.target.value)}
                  className="edit-input"
                  placeholder="Assigned to..."
                  style={{ width: '100%', padding: '6px' }}
                />
              </td>
              <td>
                <select
                  value={newItem.status}
                  onChange={(e) => handleNewItemChange('status', e.target.value)}
                  className="edit-select"
                  style={{ width: '100%', padding: '6px' }}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </td>
              <td>
                <input
                  type="text"
                  value={newItem.remark}
                  onChange={(e) => handleNewItemChange('remark', e.target.value)}
                  className="edit-input"
                  placeholder="Remarks..."
                  style={{ width: '100%', padding: '6px' }}
                />
              </td>
            </tr>
          )}

          {/* Existing Items */}
          {actionItems.map((action) => (
            <tr 
              key={action._id}
              style={editingRow === action._id ? { backgroundColor: '#fff3cd' } : {}}
            >
              <td>
                {editingRow === action._id ? (
                  <>
                    <button
                      onClick={() => saveEdit(action)}
                      className="edit-button"
                      title="Save"
                      style={{ marginRight: '5px' }}
                    >
                      💾
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="edit-button"
                      title="Cancel"
                    >
                      ❌
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(action)}
                      className="edit-button"
                      title="Edit"
                      style={{ marginRight: '5px' }}
                    >
                      ✏️
                    </button>
                    {onActionDelete && (
                      <button
                        onClick={() => handleDelete(action)}
                        className="edit-button"
                        title="Delete"
                        style={{ color: '#dc3545' }}
                      >
                        🗑️
                      </button>
                    )}
                  </>
                )}
              </td>
              <td>
                {editingRow === action._id ? (
                  <input
                    type="text"
                    value={editedData.actionItem}
                    onChange={(e) => handleEditChange('actionItem', e.target.value)}
                    className="edit-input"
                    style={{ width: '100%', padding: '6px' }}
                  />
                ) : (
                  action.actionItem
                )}
              </td>
              <td>
                {editingRow === action._id ? (
                  <input
                    type="text"
                    value={editedData.assignedTo}
                    onChange={(e) => handleEditChange('assignedTo', e.target.value)}
                    className="edit-input"
                    style={{ width: '100%', padding: '6px' }}
                  />
                ) : (
                  action.assignedTo
                )}
              </td>
              <td>
                {editingRow === action._id ? (
                  <select
                    value={editedData.status}
                    onChange={(e) => handleEditChange('status', e.target.value)}
                    className="edit-select"
                    style={{ width: '100%', padding: '6px' }}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                ) : (
                  <span className={`status-badge status-${action.status?.toLowerCase().replace(' ', '-')}`}>
                    {action.status}
                  </span>
                )}
              </td>
              <td>
                {editingRow === action._id ? (
                  <input
                    type="text"
                    value={editedData.remark}
                    onChange={(e) => handleEditChange('remark', e.target.value)}
                    className="edit-input"
                    style={{ width: '100%', padding: '6px' }}
                  />
                ) : (
                  action.remark
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {actionItems.length === 0 && !isAddingNew && (
        <div className="no-data-message">
          {blockerId 
            ? 'No action items yet. Click "+ Add Action Item" to create one.'
            : 'Select a blocker to view its action items'
          }
        </div>
      )}
    </div>
  );
};

export default ActionItemsTable;
