import React, { useState, useEffect } from 'react';

const BlockModal = ({ show, onClose, salesOrder, partNumber, lineNumber }) => {
  const [blockers, setBlockers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    type: 'Issue',
    status: 'Open',
    description: '',
    owner: '',
    category: 'Schedule',
    impact: 'High',
    probability: 'Low'
  });
  const [actionItems, setActionItems] = useState([]);
  const [isActionItemsExpanded, setIsActionItemsExpanded] = useState(false);
 
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
    const fetchBlockers = async () => {
      try {
        const response = await fetch(
          `/api/blockers?salesorder=${salesOrder}&linenumber=${lineNumber}`,
        {
          headers: getAuthHeaders()
        }
      );
        const data = await response.json();
        setBlockers(data);

        if (data.length > 0) {
          const firstBlocker = data[0];
          setFormData({
            title: firstBlocker.title || '',
            type: firstBlocker.type || 'Issue',
            status: firstBlocker.status || 'Open',
            description: firstBlocker.description || '',
            owner: firstBlocker.owner || '',
            category: firstBlocker.category || 'Schedule',
            impact: firstBlocker.impact || 'High',
            probability: firstBlocker.probability || 'Low'
          });
          fetchActions(firstBlocker._id);
        }
      } catch (error) {
        console.error('Error fetching blockers:', error);
      }
    };

    if (salesOrder && lineNumber) {
      fetchBlockers();
    }
  }, [salesOrder, lineNumber]);

  const fetchActions = async (blockerId) => {
    try {
      if (!blockerId) return;
      
      const response = await fetch(`/api/actions?blockerId=${blockerId}`,
        {
          headers: getAuthHeaders()
        }
      );
      const data = await response.json();
      setActionItems(data);
    } catch (error) {
      console.error('Error fetching actions:', error);
    }
  };

  const goToPrevious = () => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : blockers.length - 1;
    setCurrentIndex(prevIndex);
    updateFormFields(blockers[prevIndex]);
    fetchActions(blockers[prevIndex]._id);
  };

  const goToNext = () => {
    const nextIndex = currentIndex < blockers.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(nextIndex);
    updateFormFields(blockers[nextIndex]);
    fetchActions(blockers[nextIndex]._id);
  };

  const updateFormFields = (blocker) => {
    if (blocker) {
      setFormData({
        title: blocker.title || '',
        type: blocker.type || 'Issue',
        status: blocker.status || 'Open',
        description: blocker.description || '',
        owner: blocker.owner || '',
        category: blocker.category || 'Schedule',
        impact: blocker.impact || 'High',
        probability: blocker.probability || 'Low'
      });
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

    setIsActionItemsExpanded(true);
  };

  const updateActionItem = (id, field, value) => {
    setActionItems(prev => prev.map(item => 
      item._id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeActionItem = (id) => {
    setActionItems(prev => prev.filter(item => item._id !== id));
  };

  const toggleActionItems = () => {
    setIsActionItemsExpanded(!isActionItemsExpanded);
  };

  const saveActionItems = async () => {
    try {
      const blockerId = blockers[currentIndex]?._id;
      if (!blockerId) {
        alert('No blocker selected to associate actions.');
        return;
      }

      for (const action of actionItems) {
        const payload = { ...action, blockerId };
        if (action._id && !action._id.startsWith('temp')) {
          const response = await fetch(`/api/actions/${action._id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Failed to update action with ID ${action._id}`);
          }
        } else {
          const response = await fetch('/api/actions', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              blockerId,
              actionItem: action.actionItem,
              assignedTo: action.assignedTo,
              status: action.status,
              remark: action.remark
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create new action');
          }
        }
      }

      alert('Actions saved successfully');
      fetchActions(blockerId);
    } catch (error) {
      console.error('Error saving actions:', error);
      alert('Failed to save all actions. Please try again.');
    }
  };

  const handleSave = async () => {
    try {
      const currentBlocker = blockers[currentIndex];
      const method = currentBlocker ? 'PUT' : 'POST';
      const url = currentBlocker ? `/api/blockers/${currentBlocker._id}` : '/api/blockers';
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          salesorder: salesOrder,
          linenumber: lineNumber,
          partnumber: partNumber,
          ...formData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save blocker details.');
      }
      
      const savedBlocker = await response.json();
      
      if (!currentBlocker) {
        setBlockers(prev => [...prev, savedBlocker]);
        setCurrentIndex(blockers.length);
      } else {
        setBlockers(prev => prev.map((item, idx) => 
          idx === currentIndex ? { ...item, ...formData } : item
        ));
      }
      
      if (actionItems.length > 0) {
        await saveActionItems();
      }
      
      alert('Blocker details saved successfully!');
    } catch (error) {
      console.error('Error saving blocker details:', error);
      alert('Failed to save blocker details. Please try again.');
    }
  };

  if (!show) return null;

  return (
    <div className="blocker-modal-overlay">
      <div className="blocker-modal">
        <div className="blocker-modal-header">
          <h3>Blocker Details - Order: {salesOrder}, Line: {lineNumber}</h3>
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

          <div className="blocker-form-row">
            <div className="blocker-form-group">
              <label>Category:</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="blocker-form-select"
              >
                <option>Schedule</option>
                <option>Cost</option>
                <option>Effort</option>
                <option>Material</option>
                <option>Defect</option>
                <option>Design</option>
                <option>Equipment</option>
                <option>Others</option>
              </select>
            </div>

            <div className="blocker-form-group">
              <label>Owner:</label>
              <input
                type="text"
                name="owner"
                value={formData.owner}
                onChange={handleInputChange}
                className="blocker-form-input"
              />
            </div>
          </div>

          <div className="blocker-form-row">
            <div className="blocker-form-group">
              <label>Impact:</label>
              <select
                name="impact"
                value={formData.impact}
                onChange={handleInputChange}
                className="blocker-form-select"
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>

            <div className="blocker-form-group">
              <label>Probability:</label>
              <select
                name="probability"
                value={formData.probability}
                onChange={handleInputChange}
                className="blocker-form-select"
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
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
            <div 
              className={`action-items-headerr ${isActionItemsExpanded ? 'expanded' : ''}`}
              onClick={toggleActionItems}
            >
              <h4>Action Items {actionItems.length > 0 && `(${actionItems.length})`}</h4>
              <div className="action-headerr-controls">
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

          {blockers.length > 1 && (
            <div className="blocker-navigation">
              <button onClick={goToPrevious} className="nav-button">
                ← Previous
              </button>
              <span className="blocker-counter">
                {currentIndex + 1} of {blockers.length}
              </span>
              <button onClick={goToNext} className="nav-button">
                Next →
              </button>
            </div>
          )}

          <div className="blocker-modal-footer">
            <button onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button onClick={handleSave} className="save-button">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockModal;
