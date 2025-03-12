import React, { useState } from 'react';

const BlockersTable = ({ 
  blockers, 
  selectedBlocker, 
  onBlockerSelect, 
  onBlockerUpdate 
}) => {
  const [filters, setFilters] = useState({
    status: '',
    // category: '',
    // impact: ''
    priority: '',
    type: '',
    origin: ''
  });
  const [editingRow, setEditingRow] = useState(null);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value.toLowerCase()
    }));
  };

  const getBlockerOrigin = (blocker) => {
    const origins = [];
    
    if (blocker.relatedWorkOrders && blocker.relatedWorkOrders.length > 0) {
      origins.push('Work Orders');
    }
    
    if (blocker.relatedSalesOrders && blocker.relatedSalesOrders.length > 0) {
      origins.push('Sales Orders');
    }
    
    if (blocker.relatedParts && blocker.relatedParts.length > 0) {
      origins.push('Parts');
    }
    
    return origins.length > 0 ? origins.join(', ') : 'Sales Orders';
  };

  const filteredBlockers = blockers.filter(blocker => {
    const origin = getBlockerOrigin(blocker).toLowerCase();
    const statusValue = (blocker.status || '').toLowerCase();
    const typeValue = (blocker.type || '').toLowerCase();
    const priorityValue = (blocker.priority || '').toLowerCase();
    
    return (
      statusValue.includes(filters.status) &&
      typeValue.includes(filters.type) &&
      priorityValue.includes(filters.priority) &&
      origin.includes(filters.origin)
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
    // <div className="table-container">
    //   <table>
    //     <thead>
    //       <tr>
    //         <th>Edit</th>
    //         <th>Title</th>
    //         <th>
    //           Status
    //           <input
    //             type="text"
    //             className="table-filter"
    //             placeholder="Search Status"
    //             value={filters.status}
    //             onChange={(e) => handleFilterChange('status', e.target.value)}
    //           />
    //         </th>
    //         <th>Sales Order</th>
    //         <th>Line Number</th>
    //         <th>Part Number</th>
    //         <th>
    //           Category
    //           <input
    //             type="text"
    //             className="table-filter"
    //             placeholder="Search Category"
    //             value={filters.category}
    //             onChange={(e) => handleFilterChange('category', e.target.value)}
    //           />
    //         </th>
    //         <th>
    //           Impact
    //           <input
    //             type="text"
    //             className="table-filter"
    //             placeholder="Search Impact"
    //             value={filters.impact}
    //             onChange={(e) => handleFilterChange('impact', e.target.value)}
    //           />
    //         </th>
    //         <th>Owner</th>
    //         <th>Probability</th>
    //       </tr>
    //     </thead>
    //     <tbody>
    //       {filteredBlockers.map((blocker) => (
    //         <tr
    //           key={blocker._id}
    //           onClick={() => onBlockerSelect(blocker)}
    //           className={selectedBlocker?._id === blocker._id ? 'row-selected' : ''}
    //         >
    //           <td>
    //             <button
    //               onClick={(e) => {
    //                 e.stopPropagation();
    //                 toggleEdit(blocker);
    //               }}
    //               className="edit-button"
    //             >
    //               {editingRow === blocker._id ? '💾' : '✏️'}
    //             </button>
    //           </td>
    //           <td>
    //             {editingRow === blocker._id ? (
    //               <input
    //                 type="text"
    //                 defaultValue={blocker.title}
    //                 onBlur={(e) => handleSave(blocker, { ...blocker, title: e.target.value })}
    //               />
    //             ) : blocker.title}
    //           </td>
    //           <td>
    //             {editingRow === blocker._id ? (
    //               <input
    //                 type="text"
    //                 defaultValue={blocker.status}
    //                 onBlur={(e) => handleSave(blocker, { ...blocker, status: e.target.value })}
    //               />
    //             ) : blocker.status}
    //           </td>
    //           <td>{blocker.salesorder}</td>
    //           <td>{blocker.linenumber}</td>
    //           <td>{blocker.partnumber}</td>
    //           <td>
    //             {editingRow === blocker._id ? (
    //               <input
    //                 type="text"
    //                 defaultValue={blocker.category}
    //                 onBlur={(e) => handleSave(blocker, { ...blocker, category: e.target.value })}
    //               />
    //             ) : blocker.category}
    //           </td>
    //           <td>
    //             {editingRow === blocker._id ? (
    //               <input
    //                 type="text"
    //                 defaultValue={blocker.impact}
    //                 onBlur={(e) => handleSave(blocker, { ...blocker, impact: e.target.value })}
    //               />
    //             ) : blocker.impact}
    //           </td>
    //           <td>
    //             {editingRow === blocker._id ? (
    //               <input
    //                 type="text"
    //                 defaultValue={blocker.owner}
    //                 onBlur={(e) => handleSave(blocker, { ...blocker, owner: e.target.value })}
    //               />
    //             ) : blocker.owner}
    //           </td>
    //           <td>
    //             {editingRow === blocker._id ? (
    //               <input
    //                 type="text"
    //                 defaultValue={blocker.probability}
    //                 onBlur={(e) => handleSave(blocker, { ...blocker, probability: e.target.value })}
    //               />
    //             ) : blocker.probability}
    //           </td>
    //         </tr>
    //       ))}
    //     </tbody>
    //   </table>
    // </div>
    <div className="table-container left-pane">
      <table>
        <thead>
          <tr>
            <th>Edit</th>
            <th>Title</th>
            <th>
              Type
              <input
                type="text"
                className="table-filter"
                placeholder="Risk or Issue"
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              />
            </th>
            <th>Description</th>
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
            <th>
              Priority
              <input
                type="text"
                className="table-filter"
                placeholder="Low/Medium/High"
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              />
            </th>
            <th>
              Origin
              <input
                type="text"
                className="table-filter"
                placeholder="Filter by origin"
                value={filters.origin}
                onChange={(e) => handleFilterChange('origin', e.target.value)}
              />
            </th>
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
                    defaultValue={blocker.title || blocker.salesorder || ''}
                    onBlur={(e) => handleSave(blocker, { ...blocker, title: e.target.value })}
                  />
                ) : (blocker.title || blocker.salesorder || 'No Title')}
              </td>
              <td>
                {editingRow === blocker._id ? (
                  <select
                    defaultValue={blocker.type || 'Issue'}
                    onChange={(e) => handleSave(blocker, { ...blocker, type: e.target.value })}
                  >
                    <option value="Risk">Risk</option>
                    <option value="Issue">Issue</option>
                  </select>
                ) : (blocker.type || 'Issue')}
              </td>
              <td>
                {editingRow === blocker._id ? (
                  <textarea
                    defaultValue={blocker.description}
                    onBlur={(e) => handleSave(blocker, { ...blocker, description: e.target.value })}
                  />
                ) : (blocker.description || blocker.category || 'No Description')}
              </td>
              <td>
                {editingRow === blocker._id ? (
                  <select
                    defaultValue={blocker.status || 'Open'}
                    onChange={(e) => handleSave(blocker, { ...blocker, status: e.target.value })}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                  </select>
                ) : (blocker.status || 'Open')}
              </td>
              <td>
                {editingRow === blocker._id ? (
                  <select
                    defaultValue={blocker.priority}
                    onChange={(e) => handleSave(blocker, { ...blocker, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                ) : blocker.priority}
              </td>
              <td>{getBlockerOrigin(blocker)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredBlockers.length === 0 && (
        <div className="no-data-message">
          No blockers match your filter criteria
        </div>
      )}
    </div>
  );
};

export default BlockersTable;
