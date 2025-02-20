import React, { useState, useEffect } from 'react';
import './BlockerModal.css';

const BlockerModal = ({ blockerId, salesOrderId, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'Issue',
    status: 'Open',
    description: ''
  });
  const [actionItems, setActionItems] = useState([]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(isGoogleAuth && { 'Auth-Type': 'google' }),
    };
  };

  useEffect(() => {
    if (blockerId) {
      loadBlockerData();
    }
  }, [blockerId]);

  const loadBlockerData = async () => {
    try {
      const resBlocker = await fetch(`/api/blockers/${blockerId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const blocker = await resBlocker.json();
      
      setFormData({
        title: blocker.title || '',
        type: blocker.type || 'Issue',
        status: blocker.status || 'Open',
        description: blocker.description || ''
      });

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addActionItem = () => {
    setActionItems(prev => [...prev, {
      _id: `temp${Date.now()}`,
      actionItem: '',
      assignedTo: '',
      status: 'Open',
      remark: ''
    }]);
  };

  const updateActionItem = (id, field, value) => {
    setActionItems(prev => prev.map(item => 
      item._id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeActionItem = (id) => {
    setActionItems(prev => prev.filter(item => item._id !== id));
  };

  const handleSubmit = async () => {
    try {
      if (blockerId) {
        await fetch(`/api/blockers/${blockerId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(formData),
        });

        for (const ai of actionItems) {
          if (ai._id.startsWith('temp')) {
            await fetch(`/api/action-items`, {
              method: "POST",
              headers: getAuthHeaders(),
              body: JSON.stringify({
                blockerId,
                ...ai
              }),
            });
          } else {
            await fetch(`/api/action-items/${ai._id}`, {
              method: "PUT",
              headers: getAuthHeaders(),
              body: JSON.stringify(ai),
            });
          }
        }
      } else {
        const resCreate = await fetch(`/api/blockers`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...formData,
            relatedSalesOrders: [salesOrderId],
          }),
        });
        const newBlocker = await resCreate.json();

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
        <div className="blocker-modal-header">
          <h3>{blockerId ? 'Edit Risk/Issue' : 'Create Risk/Issue'}</h3>
          <button className="blocker-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="blocker-modal-body">
          <div className="blocker-form-group">
            <label>Title:</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="blocker-form-input"
            />
          </div>

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
          </div>

          <div className="blocker-form-group">
            <label>Description:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="blocker-form-textarea"
            />
          </div>

          <div className="action-items-section">
            <div className="action-items-header">
              <h4>Action Items</h4>
              <button 
                onClick={addActionItem}
                className="add-action-button"
              >
                + Add Action Item
              </button>
            </div>

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
          </div>

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
