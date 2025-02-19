import React, { useState } from 'react';

const ActionItemsTable = ({ actionItems, onActionUpdate }) => {
  const [editingRow, setEditingRow] = useState(null);

  const toggleEdit = (actionItem) => {
    if (editingRow === actionItem._id) {
      setEditingRow(null);
    } else {
      setEditingRow(actionItem._id);
    }
  };

  const handleSave = (actionItem, updatedData) => {
    onActionUpdate(actionItem._id, updatedData);
    setEditingRow(null);
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Edit</th>
            <th>Action Item</th>
            <th>Assigned To</th>
            <th>Status</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {actionItems.map((action) => (
            <tr key={action._id}>
              <td>
                <button
                  onClick={() => toggleEdit(action)}
                  className="edit-button"
                >
                  {editingRow === action._id ? '💾' : '✏️'}
                </button>
              </td>
              <td>
                {editingRow === action._id ? (
                  <input
                    type="text"
                    defaultValue={action.actionItem}
                    onBlur={(e) => handleSave(action, { ...action, actionItem: e.target.value })}
                    className="edit-input"
                  />
                ) : action.actionItem}
              </td>
              <td>
                {editingRow === action._id ? (
                  <input
                    type="text"
                    defaultValue={action.assignedTo}
                    onBlur={(e) => handleSave(action, { ...action, assignedTo: e.target.value })}
                    className="edit-input"
                  />
                ) : action.assignedTo}
              </td>
              <td>
                {editingRow === action._id ? (
                  <select
                    defaultValue={action.status}
                    onChange={(e) => handleSave(action, { ...action, status: e.target.value })}
                    className="edit-select"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                ) : action.status}
              </td>
              <td>
                {editingRow === action._id ? (
                  <input
                    type="text"
                    defaultValue={action.remark}
                    onBlur={(e) => handleSave(action, { ...action, remark: e.target.value })}
                    className="edit-input"
                  />
                ) : action.remark}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {actionItems.length === 0 && (
        <div className="no-data-message">
          Select a blocker to view its action items
        </div>
      )}
    </div>
  );
};

export default ActionItemsTable;