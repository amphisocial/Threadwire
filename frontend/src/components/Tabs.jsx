import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

const Tabs = ({ filters, onFilterChange }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const tabs = [
    'Visualization',
    'Blockers',
    'Sales Orders',
    'Work Orders',
    'Parts',
    'Dashboard'
  ];

  const handleTabClick = (tab) => {
    switch (tab) {
      case 'Blockers':
        navigate('/blockers');
        break;
      case 'Visualization':
        navigate('/graphview');
        break;
      case 'Sales Orders':
        navigate('/salesorders');
        break;
      case 'Work Orders':
        navigate('/workorders');
        break;
      case 'Parts':
        navigate('/parts');
        break;
      case 'Dashboard':
        navigate('/dashboard');
        break;
      default:
        console.error(`Unknown tab: ${tab}`);
    }
  };

  return (
    <div className="tabs-container">
      <div className="top-row">
        <div className="tabs-group">
          {tabs.map((tab) => (
            <button
              key={tab}
              className="tab-button"
              onClick={() => handleTabClick(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <button className="tab-button logout" onClick={logout}>
          Logout
        </button>
      </div>
      
      <div className="filter-container">
        <select
          className="filter-dropdown"
          value={filters.shippingStatus}
          onChange={(e) => onFilterChange('shippingStatus', e.target.value)}
        >
          <option value="None">Shipping Status</option>
          <option value="Started">Started</option>
          <option value="Not Started">Not Started</option>
          <option value="Delivered">Delivered</option>
        </select>
        <input
          type="text"
          className="filter-input"
          placeholder="Search by Part Number"
          value={filters.partNumber === 'Search by Part Number' ? '' : filters.partNumber}
          onChange={(e) => onFilterChange('partNumber', e.target.value || 'Search by Part Number')}
        />
        <input
          type="text"
          className="filter-input"
          placeholder="Search by Customer"
          value={filters.customer === 'Search by Customer' ? '' : filters.customer}
          onChange={(e) => onFilterChange('customer', e.target.value || 'Search by Customer')}
        />
      </div>
    </div>
  );
};

export default Tabs;