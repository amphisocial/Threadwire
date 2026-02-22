/**
 * =============================================================================
 * BlockersTable Component
 * =============================================================================
 * Displays a table of all blockers with filtering, sorting, and inline editing.
 * 
 * Features:
 * - Filterable columns (Type, Status, Priority, Origin)
 * - Inline editing for all fields
 * - Row selection for viewing details
 * - Sortable columns: Est. Completion Date, Total Amount Blocked
 * - Shows Assigned To, Description, and calculated Total Amount Blocked
 * 
 * Updated: February 6, 2026
 * - Added Description column (BL-1)
 * - Added sortable Est. Completion Date column (BL-2)
 * - Added Total Amount Blocked column with sorting (BL-3)
 * =============================================================================
 */

import React, { useState } from 'react';

const BlockersTable = ({ 
  blockers, 
  selectedBlocker, 
  onBlockerSelect, 
  onBlockerUpdate 
}) => {
  // Filter state for searchable columns
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    type: '',
    origin: ''
  });
  
  // Track which row is being edited
  const [editingRow, setEditingRow] = useState(null);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    field: null,  // 'estimatedCompletionDate' or 'totalAmountBlocked'
    direction: 'asc'  // 'asc' or 'desc'
  });

  /**
   * Handle filter input changes
   */
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value.toLowerCase()
    }));
  };

  /**
   * Calculate total amount blocked from related Sales Orders
   * Sums up the 'amount' field from all related sales orders
   */
  const getTotalAmountBlocked = (blocker) => {
    if (!blocker.relatedSalesOrders || blocker.relatedSalesOrders.length === 0) {
      return 0;
    }
    
    return blocker.relatedSalesOrders.reduce((total, so) => {
      // Handle both populated (object) and unpopulated (string) cases
      const amount = typeof so === 'object' ? (so.amount || 0) : 0;
      return total + amount;
    }, 0);
  };

  /**
   * Format currency for display
   */
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  /**
   * Handle column header click for sorting
   */
  const handleSort = (field) => {
    setSortConfig(prev => ({
      field: field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  /**
   * Get sort indicator icon
   */
  const getSortIcon = (field) => {
    if (sortConfig.field !== field) return ' ↕️';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  /**
   * Determine the origin of a blocker based on related entities
   */
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

  /**
   * Format date for display (returns formatted date or '-')
   */
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Format date for input field (YYYY-MM-DD)
   */
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  /**
   * Get display name for assigned user
   */
  const getAssignedToDisplay = (blocker) => {
    if (!blocker.assignedTo) return '-';
    
    // If populated (object), show name or email
    if (typeof blocker.assignedTo === 'object') {
      return blocker.assignedTo.name || blocker.assignedTo.email || '-';
    }
    
    // If string (not populated), just show the ID or a placeholder
    return blocker.assignedTo;
  };

  /**
   * Filter blockers based on current filter values
   */
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

  /**
   * Sort the filtered blockers
   */
  const sortedBlockers = [...filteredBlockers].sort((a, b) => {
    if (!sortConfig.field) return 0;

    let aValue, bValue;

    if (sortConfig.field === 'estimatedCompletionDate') {
      // Handle date sorting - treat null/undefined as far future
      aValue = a.estimatedCompletionDate ? new Date(a.estimatedCompletionDate).getTime() : Infinity;
      bValue = b.estimatedCompletionDate ? new Date(b.estimatedCompletionDate).getTime() : Infinity;
    } else if (sortConfig.field === 'totalAmountBlocked') {
      // Handle amount sorting
      aValue = getTotalAmountBlocked(a);
      bValue = getTotalAmountBlocked(b);
    }

    // Apply sort direction
    if (sortConfig.direction === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

  /**
   * Toggle edit mode for a row
   */
  const toggleEdit = (blocker) => {
    if (editingRow === blocker._id) {
      setEditingRow(null);
    } else {
      setEditingRow(blocker._id);
    }
  };

  /**
   * Save blocker changes
   */
  const handleSave = (blocker, updatedData) => {
    onBlockerUpdate(blocker._id, updatedData);
    setEditingRow(null);
  };

  return (
    <div className="table-container left-pane">
      <table>
        <thead>
          <tr>
            <th>Edit</th>
            <th>Title</th>
            <th>
              Description
            </th>
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
                placeholder="Low/Med/High"
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              />
            </th>
            <th>Assigned To</th>
            <th 
              onClick={() => handleSort('estimatedCompletionDate')}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              title="Click to sort"
            >
              Est. Completion{getSortIcon('estimatedCompletionDate')}
            </th>
            <th 
              onClick={() => handleSort('totalAmountBlocked')}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              title="Click to sort"
            >
              Total $ Blocked{getSortIcon('totalAmountBlocked')}
            </th>
            <th>
              Origin
              <input
                type="text"
                className="table-filter"
                placeholder="Filter origin"
                value={filters.origin}
                onChange={(e) => handleFilterChange('origin', e.target.value)}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedBlockers.map((blocker) => (
            <tr
              key={blocker._id}
              onClick={() => onBlockerSelect(blocker)}
              className={selectedBlocker?._id === blocker._id ? 'row-selected' : ''}
            >
              {/* Edit Button */}
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
              
              {/* Title */}
              <td>
                {editingRow === blocker._id ? (
                  <input
                    type="text"
                    defaultValue={blocker.title || blocker.salesorder || ''}
                    onBlur={(e) => handleSave(blocker, { ...blocker, title: e.target.value })}
                  />
                ) : (blocker.title || blocker.salesorder || 'No Title')}
              </td>
              
              {/* NEW: Description (BL-1) */}
              <td>
                {editingRow === blocker._id ? (
                  <input
                    type="text"
                    defaultValue={blocker.description || ''}
                    onBlur={(e) => handleSave(blocker, { ...blocker, description: e.target.value })}
                    style={{ minWidth: '150px' }}
                  />
                ) : (blocker.description || '-')}
              </td>
              
              {/* Type */}
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
              
              {/* Status */}
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
              
              {/* Priority */}
              <td>
                {editingRow === blocker._id ? (
                  <select
                    defaultValue={blocker.priority || 'Low'}
                    onChange={(e) => handleSave(blocker, { ...blocker, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                ) : (blocker.priority || 'Low')}
              </td>
              
              {/* Assigned To */}
              <td>
                {getAssignedToDisplay(blocker)}
              </td>
              
              {/* Est. Completion Date (BL-2 - Sortable) */}
              <td>
                {editingRow === blocker._id ? (
                  <input
                    type="date"
                    defaultValue={formatDateForInput(blocker.estimatedCompletionDate)}
                    onChange={(e) => handleSave(blocker, { 
                      ...blocker, 
                      estimatedCompletionDate: e.target.value || null 
                    })}
                    style={{ width: '130px' }}
                  />
                ) : formatDate(blocker.estimatedCompletionDate)}
              </td>
              
              {/* NEW: Total Amount Blocked (BL-3 - Sortable) */}
              <td style={{ textAlign: 'right', fontWeight: '600' }}>
                {formatCurrency(getTotalAmountBlocked(blocker))}
              </td>
              
              {/* Origin */}
              <td>{getBlockerOrigin(blocker)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* No Results Message */}
      {sortedBlockers.length === 0 && (
        <div className="no-data-message">
          No blockers match your filter criteria
        </div>
      )}
    </div>
  );
};

export default BlockersTable;
