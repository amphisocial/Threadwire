import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

const Tabs = ({ filters, onFilterChange }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const getCurrentPage = () => {
    const path = window.location.pathname;
    return path.substring(1).split('.')[0] || 'home';
  };

  const currentPage = getCurrentPage();


  const handleTabClick = (tab) => {
    switch (tab) {
      case 'Blockers':
        navigate('/blockers');
        break;
      case 'Visualization':
        navigate('/visualization');
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
        navigate('/home');
        break;
      default:
        console.error(`Unknown tab: ${tab}`);
    }
  };

  return (
    <div className="tabs-container">
      <nav className="navbar">
        <div className="home-icon" onClick={() => navigate('/home')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
        <button 
          onClick={() => handleNavigation('blockers')}
          className={currentPage === 'blockers' ? 'active' : ''}
        >
          Blockers
        </button>
        <button 
          onClick={() => handleNavigation('salesorders')}
          className={currentPage === 'salesorders' ? 'active' : ''}
        >
          Sales Orders
        </button>
        <button 
          onClick={() => handleNavigation('dashboard')}
          className={currentPage === 'home' ? 'active' : ''}
        >
          Dashboard
        </button>
        <button 
          onClick={() => handleNavigation('parts')}
          className={currentPage === 'parts' ? 'active' : ''}
        >
          Parts
        </button>
        <button 
          onClick={() => handleNavigation('workorders')}
          className={currentPage === 'workorders' ? 'active' : ''}
        >
          Work Orders
        </button>
        <button 
          onClick={() => handleNavigation('visualization')}
          className={currentPage === 'visualization' ? 'active' : ''}
        >
          Visualization
        </button>
        <button 
          onClick={logout}
        >
          Logout
        </button>
      </nav>

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
