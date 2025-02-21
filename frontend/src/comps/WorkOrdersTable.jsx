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

  const filteredWorkOrders = workOrders.filter(wo => {
    const matchesWorkOrder = wo.workorder.toLowerCase().includes(filters.workOrder);
    const matchesPartNumber = wo.partnumber.toLowerCase().includes(filters.partNumber);
    return matchesWorkOrder && matchesPartNumber;
  });

  return (
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
        {filteredWorkOrders.map((workOrder) => (
          <tr
            key={workOrder._id}
            className={`
              ${selectedWorkOrder?._id === workOrder._id ? 'wo-row-highlighted' : ''}
              ${workOrder.blockerTag > 0 ? 'wo-row-has-blocker' : ''}
            `}
            onClick={() => onWorkOrderSelect(workOrder)}
          >
            <td>{workOrder.workorder}</td>
            <td>{workOrder.partnumber}</td>
            <td>{workOrder.salesorder}</td>
            <td>{workOrder.type}</td>
            <td>{workOrder.dateCreated}</td>
            <td>{workOrder.quantity}</td>
            <td>{workOrder.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default WorkOrdersTable;