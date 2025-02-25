import React from 'react';
import './NavBar.css';
import { useAuth } from '../context/authContext';
import { useNavigate } from 'react-router-dom';


const Navbar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();  
  const getCurrentPage = () => {
    const path = window.location.pathname;
    return path.substring(1).split('.')[0] || 'dashboard';
  };

  const handleNavigation = (page) => {
    switch (page) {
      case "blockers":
        navigate('/blockers');
        break;
      case "salesorders":
        navigate('/salesorders');
        break;
      case "dashboard":
        navigate('/home');
        break;
      case "graph":
        navigate('/visualization');
        break;
      case "parts":
        navigate('/parts');
        break;
      case "workorders":
        navigate('/workorders');
        break;
      default:
        console.error(`Unknown page: ${page}`);
    }
  };

  const currentPage = getCurrentPage();

  return (
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
        Salesorders
      </button>
      <button 
        onClick={() => handleNavigation('dashboard')}
        className={currentPage === 'dashboard' ? 'active' : ''}
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
        Workorders
      </button>
      <button 
        onClick={() => handleNavigation('graph')}
        className={currentPage === 'graph' ? 'active' : ''}
      >
        Visualization
      </button>
      <button 
        onClick={logout}
      >
        Logout
      </button>
    </nav>
  );
};

export default Navbar;
