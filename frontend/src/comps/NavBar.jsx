import React from 'react';
import './NavBar.css';
import { useAuth } from '../context/authContext';


const Navbar = () => {
  const { logout } = useAuth();
    
  const getCurrentPage = () => {
    const path = window.location.pathname;
    return path.substring(1).split('.')[0] || 'dashboard';
  };

  const handleNavigation = (page) => {
    switch (page) {
      case "blockers":
        window.location.href = "blockers.html";
        break;
      case "salesorders":
        window.location.href = "/salesorders";
        break;
      case "dashboard":
        window.location.href = "/home";
        break;
      case "graph":
        window.location.href = "graphview.html";
        break;
      case "parts":
        window.location.href = "parts.html";
        break;
      case "workorders":
        window.location.href = "workorders.html";
        break;
      default:
        console.error(`Unknown page: ${page}`);
    }
  };

  const currentPage = getCurrentPage();

  return (
    <nav className="navbar">
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