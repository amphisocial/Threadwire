import React, { useState, useEffect } from 'react';

const ActionItemRow = ({ actionItem, onUpdate, onDelete }) => {
  return (
    <tr>
      <td>
        <input
          type="text"
          className="pb-input-field"
          value={actionItem.actionItem}
          onChange={(e) => onUpdate({ ...actionItem, actionItem: e.target.value })}
        />
      </td>
      <td>
        <input
          type="text"
          className="pb-input-field"
          value={actionItem.assignedTo}
          onChange={(e) => onUpdate({ ...actionItem, assignedTo: e.target.value })}
        />
      </td>
      <td>
        <select
          className="pb-select-field"
          value={actionItem.status}
          onChange={(e) => onUpdate({ ...actionItem, status: e.target.value })}
        >
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </td>
      <td>
        <input
          type="text"
          className="pb-input-field"
          value={actionItem.remark}
          onChange={(e) => onUpdate({ ...actionItem, remark: e.target.value })}
        />
      </td>
      <td>
        <button
          className="pb-delete-button"
          onClick={() => onDelete(actionItem._id)}
        >
          X
        </button>
      </td>
    </tr>
  );
};

const BlockerPartsModal = ({ isEditing, part, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'Issue',
    status: 'Open',
    description: ''
  });
  const [actionItems, setActionItems] = useState([]);
  const [blockerId, setBlockerId] = useState(null);
  const [isActionItemsExpanded, setIsActionItemsExpanded] = useState(false);

  useEffect(() => {
    if (isEditing && part) {
      loadExistingBlocker();
    }
  }, [isEditing, part]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(isGoogleAuth && { 'Auth-Type': 'google' }),
    };
  };

  const loadExistingBlocker = async () => {
    try {
      const res = await fetch(`/api/blockers?relatedParts=${part._id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const blockers = await res.json();

      if (blockers.length > 0) {
        const blocker = blockers[0];
        setBlockerId(blocker._id);
        setFormData({
          title: blocker.title || '',
          type: blocker.type || 'Issue',
          status: blocker.status || 'Open',
          description: blocker.description || ''
        });

        const resAI = await fetch(`/api/action-items/blocker/${blocker._id}`, {
          method: 'GET',
          headers: getAuthHeaders(),
        });
        const actionItemsData = await resAI.json();
        setActionItems(actionItemsData);
      } else {
        alert('No existing Risk/Issue found for this part.');
        onClose();
      }
    } catch (error) {
      console.error('Error loading blocker:', error);
      alert('Failed to load existing risk/issue data.');
      onClose();
    }
  };

  const handleAddActionItem = () => {
    setActionItems([
      ...actionItems,
      {
        _id: `temp-${Date.now()}`,
        actionItem: '',
        assignedTo: '',
        status: 'Open',
        remark: ''
      }
    ]);

    setIsActionItemsExpanded(true);
  };

  const handleUpdateActionItem = (updatedItem) => {
    setActionItems(actionItems.map(item =>
      item._id === updatedItem._id ? updatedItem : item
    ));
  };

  const handleDeleteActionItem = (itemId) => {
    setActionItems(actionItems.filter(item => item._id !== itemId));
  };

  const toggleActionItems = () => {
    setIsActionItemsExpanded(!isActionItemsExpanded);
  };

  const handleSave = async () => {
    try {
      if (isEditing && blockerId) {
        // Update existing blocker
        await fetch(`/api/blockers/${blockerId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(formData)
        });

        // Handle action items
        for (const ai of actionItems) {
          if (ai._id.startsWith('temp-')) {
            // Create new action item
            await fetch('/api/action-items', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                blockerId,
                actionItem: ai.actionItem,
                assignedTo: ai.assignedTo,
                status: ai.status,
                remark: ai.remark
              })
            });
          } else {
            // Update existing action item
            await fetch(`/api/action-items/${ai._id}`, {
              method: 'PUT',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                actionItem: ai.actionItem,
                assignedTo: ai.assignedTo,
                status: ai.status,
                remark: ai.remark
              })
            });
          }
        }
      } else {
        // Create new blocker
        const res = await fetch('/api/blockers', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...formData,
            relatedParts: [part._id]
          })
        });
        const newBlocker = await res.json();

        // Create action items
        for (const ai of actionItems) {
          await fetch('/api/action-items', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              blockerId: newBlocker._id,
              actionItem: ai.actionItem,
              assignedTo: ai.assignedTo,
              status: ai.status,
              remark: ai.remark
            })
          });
        }
      }

      alert('Risk/Issue saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving blocker:', error);
      alert('Failed to save Risk/Issue. Check console for details.');
    }
  };

  return (
    <div className="pb-modal-overlay">
      <div className="pb-modal">
        <div className="pb-modal-header">
          <h3 className="pb-modal-title">
            {isEditing ? 'Edit Risk/Issue' : 'Create Risk/Issue'}
          </h3>
          <button
            className="pb-close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="pb-modal-content">
          <div className="pb-form-group">
            <label>Title:</label>
            <input
              type="text"
              className="pb-input-field"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="pb-form-group">
            <label>Type:</label>
            <select
              className="pb-select-field"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="Issue">Issue</option>
              <option value="Risk">Risk</option>
            </select>
          </div>

          <div className="pb-form-group">
            <label>Status:</label>
            <select
              className="pb-select-field"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="pb-form-group">
            <label>Description:</label>
            <textarea
              className="pb-textarea-field"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="pb-action-items-container">
            <div
              className={`pb-action-items-header ${isActionItemsExpanded ? 'expanded' : ''}`}
              onClick={toggleActionItems}
            >
              <h4>Action Items {actionItems.length > 0 && `(${actionItems.length})`}</h4>
              <div className="pb-header-controls">
                <span className="pb-items-count">
                  {actionItems.filter(item => item.status === 'Completed').length}/{actionItems.length} completed
                </span>
                <span className="pb-toggle-icon">{isActionItemsExpanded ? '▼' : '►'}</span>
              </div>
            </div>

            {isActionItemsExpanded && (
              <div className="pb-action-items-content">
                <button
                  className="pb-add-button"
                  onClick={handleAddActionItem}
                >
                  + Add Action Item
                </button>

                {actionItems.length > 0 ? (
                  <table className="pb-action-items-table">
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
                      {actionItems.map(item => (
                        <ActionItemRow
                          key={item._id}
                          actionItem={item}
                          onUpdate={handleUpdateActionItem}
                          onDelete={handleDeleteActionItem}
                        />
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="pb-no-items">No action items added yet.</div>
                )}
              </div>
            )}
          </div>

          <div className="pb-modal-footer">
            <button
              className="pb-cancel-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="pb-save-button"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockerPartsModal;
