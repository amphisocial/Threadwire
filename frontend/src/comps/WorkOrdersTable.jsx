import React, { useState } from 'react';

const WorkOrdersTable = ({ workOrders, selectedWorkOrder, onWorkOrderSelect }) => {
  const [filters, setFilters] = useState({
    workOrder: '',
    partNumber: ''
  });

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value.toLowerCase()
    }));
  };

   const workOrdersArray = Array.isArray(workOrders) ? workOrders : [];

  const filteredWorkOrders = workOrdersArray.filter(wo => {
    if (!wo) return false; // Skip null or undefined items
    const workorderStr = String(wo.workorder || '').toLowerCase();
    const partnumberStr = String(wo.partnumber || '').toLowerCase();
    return workorderStr.includes(filters.workOrder) && 
           partnumberStr.includes(filters.partNumber);
  });

  return (
    <div className="wo-table-container">
    <table className="wo-table">
      <thead>
        <tr>
          <th>
            WORKORDER
            <input
              type="text"
              placeholder="Search WorkOrder"
              value={filters.workOrder}
              onChange={(e) => handleFilterChange('workOrder', e.target.value)}
              className="wo-search-input"
            />
          </th>
          <th>
            PARTNUMBER
            <input
              type="text"
              placeholder="Search PartNumber"
              value={filters.partNumber}
              onChange={(e) => handleFilterChange('partNumber', e.target.value)}
              className="wo-search-input"
            />
          </th>
          <th>SALESORDER</th>
          <th>TYPE</th>
          <th>DATE CREATED</th>
          <th>QUANTITY</th>
          <th>STATUS</th>
        </tr>
      </thead>
      <tbody>
        {filteredWorkOrders.length > 0 ? (
          filteredWorkOrders.map((workOrder) => (
            <tr
              key={workOrder._id || `${workOrder.workorder}-${workOrder.partnumber}`}
              className={`
                ${selectedWorkOrder?._id === workOrder._id ? 'wo-row-highlighted' : ''}
                ${workOrder.blockerTag > 0 ? 'wo-row-has-blocker' : ''}
              `}
              onClick={() => onWorkOrderSelect(workOrder)}
            >
              <td>{workOrder.workorder || '-'}</td>
              <td>{workOrder.partnumber || '-'}</td>
              <td>{workOrder.salesorder || '-'}</td>
              <td>{workOrder.type || '-'}</td>
              <td>{workOrder.dateCreated || '-'}</td>
              <td>{workOrder.quantity || '-'}</td>
              <td>{workOrder.status || '-'}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="7" className="wo-no-data">
              No work orders found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
  );
};

export default WorkOrdersTable;
