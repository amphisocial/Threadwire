import React, { useState } from 'react';
import './SalesOrdersTable.css';

const SalesOrdersTable = ({ 
  salesOrders, 
  selectedSalesOrder, 
  onSelectSalesOrder,
  onUpdateSalesOrders 
}) => {
  const [filters, setFilters] = useState({
    orderNumber: '',
    partNumber: '',
    customerName: '',
    shippingStatus: ''
  });

  const [editingRow, setEditingRow] = useState(null);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value.toLowerCase()
    }));
  };

  const filteredOrders = salesOrders.filter(order => {
    return (
      order.ordernumber.toLowerCase().includes(filters.orderNumber) &&
      order.partnumber.toLowerCase().includes(filters.partNumber) &&
      order.customer_name.toLowerCase().includes(filters.customerName) &&
      order.shipping_status.toLowerCase().includes(filters.shippingStatus)
    );
  });

  const handleRowClick = (order) => {
    if (editingRow !== order.ordernumber) {
      onSelectSalesOrder(order);
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(isGoogleAuth && { 'Auth-Type': 'google' }),
    };
  };

  const toggleEdit = async (order) => {
    if (editingRow === order.ordernumber) {
      try {
        const response = await fetch(`/api/salesorders`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ordernumber: order.ordernumber,
            linenumber: order.linenumber,
            blockerTag: order.blockerTag,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save sales order");
        }

        alert("Sales order saved successfully.");
        setEditingRow(null);
        onUpdateSalesOrders();
      } catch (error) {
        console.error("Error saving sales order:", error);
        alert("Error saving changes");
      }
    } else {
      setEditingRow(order.ordernumber);
    }
  };

  return (
    <div className="sales-table-container">
      <table className="sales-table">
        <thead>
          <tr>
            <th className="edit-column">Edit</th>
            <th>
              Order Number
              <input
                type="text"
                className="table-filter"
                placeholder="Search Order #"
                value={filters.orderNumber}
                onChange={(e) => handleFilterChange('orderNumber', e.target.value)}
              />
            </th>
            <th>Line Number</th>
            <th>
              Part Number
              <input
                type="text"
                className="table-filter"
                placeholder="Search Part #"
                value={filters.partNumber}
                onChange={(e) => handleFilterChange('partNumber', e.target.value)}
              />
            </th>
            <th>Quantity</th>
            <th>Amount</th>
            <th>
              Customer Name
              <input
                type="text"
                className="table-filter"
                placeholder="Search Customer"
                value={filters.customerName}
                onChange={(e) => handleFilterChange('customerName', e.target.value)}
              />
            </th>
            <th>Shipping Date</th>
            <th>
              Shipping Status
              <input
                type="text"
                className="table-filter"
                placeholder="Search Status"
                value={filters.shippingStatus}
                onChange={(e) => handleFilterChange('shippingStatus', e.target.value)}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((order) => (
            <tr
              key={`${order.ordernumber}-${order.linenumber}`}
              onClick={() => handleRowClick(order)}
              className={`
                table-row
                ${selectedSalesOrder?.ordernumber === order.ordernumber ? 'row-selected' : ''}
                ${order.blockerTag > 0 ? 'row-has-blocker' : ''}
              `}
            >
              <td className="edit-cell">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEdit(order);
                  }}
                  className="edit-button"
                >
                  {editingRow === order.ordernumber ? '💾' : '✏️'}
                </button>
              </td>
              <td>{order.ordernumber}</td>
              <td>{order.linenumber}</td>
              <td>{order.partnumber}</td>
              <td>{order.quantity}</td>
              <td>{order.amount}</td>
              <td>{order.customer_name}</td>
              <td>{order.shipping_date}</td>
              <td>
                {editingRow === order.ordernumber ? (
                  <select
                    value={order.shipping_status}
                    onChange={(e) => {
                      const newOrders = [...salesOrders];
                      const idx = newOrders.findIndex(o => o.ordernumber === order.ordernumber);
                      newOrders[idx] = { ...order, shipping_status: e.target.value };
                      onUpdateSalesOrders(newOrders);
                    }}
                    className="status-select"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                ) : (
                  order.shipping_status
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SalesOrdersTable;