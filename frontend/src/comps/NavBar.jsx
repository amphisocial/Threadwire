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
