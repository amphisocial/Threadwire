import React, { useState, useEffect, forwardRef, useImperativeHandle} from 'react';

const BlockerManager = forwardRef(({ selectedWorkOrder, onBlockerSaved}, ref) => {
  const [showModal, setShowModal] = useState(false);
  const [currentBlockerId, setCurrentBlockerId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'Issue',
    status: 'Open',
    description: ''
  });
  const [actionItems, setActionItems] = useState([]);

  useImperativeHandle(ref, () => ({
    handleAddRiskIssue: () => {
      openBlockerModalForCreate();
    },
    handleEditRiskIssue: async () => {
      await findAndEditBlocker();
    }
  }));

  // Authentication headers helper
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(isGoogleAuth && { 'Auth-Type': 'google' }),
    };
  };

  // Load blocker data when editing an existing blocker
  useEffect(() => {
    if (currentBlockerId) {
      loadBlockerData();
    }
  }, [currentBlockerId]);

  const loadBlockerData = async () => {
    try {
      // Fetch the blocker data
      const resBlocker = await fetch(`/api/blockers/${currentBlockerId}`, {
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

      // Fetch action items
      const resAI = await fetch(`/api/action-items/blocker/${currentBlockerId}`, {
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

  const openBlockerModalForCreate = () => {
    setCurrentBlockerId(null);
    setFormData({
      title: '',
      type: 'Issue',
      status: 'Open',
      description: ''
    });
    setActionItems([]);
    setShowModal(true);
  };


  const findAndEditBlocker = async () => {
    if (!selectedWorkOrder) {
      alert("Please select a Work Order first.");
      return;
    }
    
    try {
      // Fetch blockers referencing this workorder
      const res = await fetch(`/api/blockers?relatedWorkOrders=${selectedWorkOrder._id}`, {
        headers: getAuthHeaders ? getAuthHeaders() : { 'Content-Type': 'application/json' },
      });
      const blockers = await res.json();

      if (!blockers || blockers.length === 0) {
        alert("No existing Risk/Issue found for this Work Order.");
        return;
      }
      
      // For simplicity, open the first result
      setCurrentBlockerId(blockers[0]._id);
      setShowModal(true);
    } catch (err) {
      console.error("Error finding blockers:", err);
      alert("Failed to find risk/issue for this workorder.");
    }
  };

  // Handle input changes for the blocker form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add a new action item
  const addActionItem = () => {
    setActionItems(prev => [
      ...prev, 
      {
        _id: "temp" + Date.now(),
        actionItem: "",
        assignedTo: "",
        status: "Open",
        remark: ""
      }
    ]);
  };

  // Update an action item
  const updateActionItem = (id, field, value) => {
    setActionItems(prev => prev.map(item => 
      item._id === id ? { ...item, [field]: value } : item
    ));
  };

  // Remove an action item
  const removeActionItem = (id) => {
    setActionItems(prev => prev.filter(item => item._id !== id));
  };

  // Close the modal
  const handleClose = () => {
    setShowModal(false);
  };

  // Save the blocker and action items
  const handleSubmit = async () => {
    if (!selectedWorkOrder) {
      alert("No Work Order row selected!");
      return;
    }
    
    try {
      if (currentBlockerId) {
        // Update existing blocker
        await fetch(`/api/blockers/${currentBlockerId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(formData),
        });

        // Update or create action items
        for (const ai of actionItems) {
          if (ai._id.startsWith("temp")) {
            // Create new action item
            await fetch("/api/action-items", {
              method: "POST",
              headers: getAuthHeaders(),
              body: JSON.stringify({
                blockerId: currentBlockerId,
                actionItem: ai.actionItem,
                assignedTo: ai.assignedTo,
                status: ai.status,
                remark: ai.remark,
              }),
            });
          } else {
            // Update existing action item
            await fetch(`/api/action-items/${ai._id}`, {
              method: "PUT",
              headers: getAuthHeaders(),
              body: JSON.stringify({
                actionItem: ai.actionItem,
                assignedTo: ai.assignedTo,
                status: ai.status,
                remark: ai.remark,
              }),
            });
          }
        }
      } else {
        // Create new blocker
        const resCreate = await fetch("/api/blockers", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ...formData,
            relatedWorkOrders: [selectedWorkOrder._id],
          }),
        });
        const newBlocker = await resCreate.json();

        // Create action items for the new blocker
        for (const ai of actionItems) {
          await fetch("/api/action-items", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              blockerId: newBlocker._id,
              actionItem: ai.actionItem,
              assignedTo: ai.assignedTo,
              status: ai.status,
              remark: ai.remark,
            }),
          });
        }
      }

      alert("Risk/Issue saved successfully!");
      setShowModal(false);
      
      // Call the callback to refresh data in the parent component
      if (onBlockerSaved) {
        onBlockerSaved();
      }
    } catch (err) {
      console.error("Error saving Blocker or Action Items:", err);
      alert("Failed to save. Check console for details.");
    }
  };

  if (!showModal) {
    return null;
  }

  return (
    <>
      {/* Modal */}
      {showModal && (
        <div className="pb-modal-overlay">
          <div className="pb-modal">
            <div className="pb-modal-header">
              <div className="pb-modal-title">
                {currentBlockerId ? 'Edit Risk/Issue' : 'Create Risk/Issue'}
              </div>
              <button className="pb-close-button" onClick={handleClose}>×</button>
            </div>

            <div className="pb-form-group">
              <label>Title:</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="pb-input-field"
              />
            </div>

            <div className="pb-form-group">
              <label>Type:</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="pb-select-field"
              >
                <option value="Issue">Issue</option>
                <option value="Risk">Risk</option>
              </select>
            </div>

            <div className="pb-form-group">
              <label>Status:</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="pb-select-field"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="pb-form-group">
              <label>Description:</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="pb-textarea-field"
              />
            </div>

            <div className="pb-action-items-section">
              <div className="pb-section-header">
                <h4>Action Items</h4>
                <button 
                  onClick={addActionItem}
                  className="pb-add-button"
                >
                  + Add Action Item
                </button>
              </div>

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
                  {actionItems.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <input
                          type="text"
                          value={item.actionItem}
                          onChange={(e) => updateActionItem(item._id, 'actionItem', e.target.value)}
                          className="pb-input-field"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.assignedTo}
                          onChange={(e) => updateActionItem(item._id, 'assignedTo', e.target.value)}
                          className="pb-input-field"
                        />
                      </td>
                      <td>
                        <select
                          value={item.status}
                          onChange={(e) => updateActionItem(item._id, 'status', e.target.value)}
                          className="pb-select-field"
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
                          className="pb-input-field"
                        />
                      </td>
                      <td>
                        <button
                          onClick={() => removeActionItem(item._id)}
                          className="pb-delete-button"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pb-modal-footer">
              <button onClick={handleClose} className="pb-cancel-button">
                Cancel
              </button>
              <button onClick={handleSubmit} className="pb-save-button">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default BlockerManager;