import React, { useState } from 'react';

const BlockersTable = ({ 
  blockers, 
  selectedBlocker, 
  onBlockerSelect, 
  onBlockerUpdate 
}) => {
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    impact: ''
  });
  const [editingRow, setEditingRow] = useState(null);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value.toLowerCase()
    }));
  };

  const filteredBlockers = blockers.filter(blocker => {
    return (
      blocker.status?.toLowerCase().includes(filters.status) &&
      blocker.category?.toLowerCase().includes(filters.category) &&
      blocker.impact?.toLowerCase().includes(filters.impact)
    );
  });

  const toggleEdit = (blocker) => {
    if (editingRow === blocker._id) {
      setEditingRow(null);
    } else {
      setEditingRow(blocker._id);
    }
  };

  const handleSave = (blocker, updatedData) => {
    onBlockerUpdate(blocker._id, updatedData);
    setEditingRow(null);
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Edit</th>
            <th>Title</th>
            <th>
              Status
              <input
                type="text"
                className="table-filter"
                placeholder="Search Status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              />
            </th>
            <th>Sales Order</th>
            <th>Line Number</th>
            <th>Part Number</th>
            <th>
              Category
              <input
                type="text"
                className="table-filter"
                placeholder="Search Category"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              />
            </th>
            <th>
              Impact
              <input
                type="text"
                className="table-filter"
                placeholder="Search Impact"
                value={filters.impact}
                onChange={(e) => handleFilterChange('impact', e.target.value)}
              />
            </th>
            <th>Owner</th>
            <th>Probability</th>
          </tr>
        </thead>
        <tbody>
          {filteredBlockers.map((blocker) => (
            <tr
              key={blocker._id}
              onClick={() => onBlockerSelect(blocker)}
              className={selectedBlocker?._id === blocker._id ? 'row-selected' : ''}
            >
              <td>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEdit(blocker);
                  }}
                  className="edit-button"
                >
                  {editingRow === blocker._id ? '💾' : '✏️'}
                </button>
              </td>
              <td>
                {editingRow === blocker._id ? (
                  <input
                    type="text"
                    defaultValue={blocker.title}
                    onBlur={(e) => handleSave(blocker, { ...blocker, title: e.target.value })}
                  />
                ) : blocker.title}
              </td>
              <td>
                {editingRow === blocker._id ? (
                  <input
                    type="text"
                    defaultValue={blocker.status}
                    onBlur={(e) => handleSave(blocker, { ...blocker, status: e.target.value })}
                  />
                ) : blocker.status}
              </td>
              <td>{blocker.salesorder}</td>
              <td>{blocker.linenumber}</td>
              <td>{blocker.partnumber}</td>
              <td>
                {editingRow === blocker._id ? (
                  <input
                    type="text"
                    defaultValue={blocker.category}
                    onBlur={(e) => handleSave(blocker, { ...blocker, category: e.target.value })}
                  />
                ) : blocker.category}
              </td>
              <td>
                {editingRow === blocker._id ? (
                  <input
                    type="text"
                    defaultValue={blocker.impact}
                    onBlur={(e) => handleSave(blocker, { ...blocker, impact: e.target.value })}
                  />
                ) : blocker.impact}
              </td>
              <td>
                {editingRow === blocker._id ? (
                  <input
                    type="text"
                    defaultValue={blocker.owner}
                    onBlur={(e) => handleSave(blocker, { ...blocker, owner: e.target.value })}
                  />
                ) : blocker.owner}
              </td>
              <td>
                {editingRow === blocker._id ? (
                  <input
                    type="text"
                    defaultValue={blocker.probability}
                    onBlur={(e) => handleSave(blocker, { ...blocker, probability: e.target.value })}
                  />
                ) : blocker.probability}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BlockersTable;