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
    <table id="workordersTable">
      <thead>
        <tr>
          <th>
            WorkOrder
            <input
              type="text"
              placeholder="Search WorkOrder"
              value={filters.workOrder}
              onChange={(e) => handleFilterChange('workOrder', e.target.value)}
            />
          </th>
          <th>
            PartNumber
            <input
              type="text"
              placeholder="Search PartNumber"
              value={filters.partNumber}
              onChange={(e) => handleFilterChange('partNumber', e.target.value)}
            />
          </th>
          <th>SalesOrder</th>
          <th>Type</th>
          <th>Date Created</th>
          <th>Quantity</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {filteredWorkOrders.map((workOrder) => (
          <tr
            key={workOrder._id}
            className={`
              ${selectedWorkOrder?._id === workOrder._id ? 'highlighted' : ''}
              ${workOrder.blockerTag > 0 ? 'has-blocker' : ''}
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