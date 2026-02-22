/**
 * =============================================================================
 * NavBar.jsx - Main Navigation Component (Tabular Design)
 * =============================================================================
 * Uses class name "tw-nav" instead of "navbar" to avoid CSS conflicts
 * with the global styles.css which has .navbar rules.
 * 
 * Used by: CalendarView, SalesOrders, WorkOrders, Parts, Blockers,
 *          GraphView, UserManagement, Chatbot
 * 
 * Last Updated: February 10, 2026
 * =============================================================================
 */

import React from 'react';
import './NavBar.css';
import { useAuth } from '../context/authContext';
import { useNavigate } from 'react-router-dom';

/* ===== Inline SVG Icon Components ===== */

const IconDashboard = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

const IconSalesOrders = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconWorkOrders = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const IconPartNumbers = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconBlockers = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconReporting = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const IconUsers = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconChat = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconLogout = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const Navbar = () => {
  const { logout, isPowerUser } = useAuth();
  const navigate = useNavigate();

  const getCurrentPage = () => {
    const path = window.location.pathname.replace('/app', '');
    return path.substring(1).split('.')[0] || 'home';
  };

  const currentPage = getCurrentPage();

  const isActive = (tabId) => {
    if (tabId === 'dashboard') return currentPage === 'home' || currentPage === 'calendar';
    if (tabId === 'reporting') return currentPage === 'visualization' || currentPage === 'graph';
    if (tabId === 'usermanagement') return currentPage === 'user-management';
    return currentPage === tabId;
  };

  const handleNavigation = (page) => {
    switch (page) {
      case "dashboard": navigate('/home'); break;
      case "salesorders": navigate('/salesorders'); break;
      case "workorders": navigate('/workorders'); break;
      case "partnumbers": navigate('/parts'); break;
      case "blockers": navigate('/blockers'); break;
      case "reporting": navigate('/visualization'); break;
      case "usermanagement": navigate('/user-management'); break;
      case "chat": navigate('/chatbot'); break;
      default: console.error(`Unknown page: ${page}`);
    }
  };

  return (
    <nav className="tw-nav">
      <div className={`tw-nav-chat ${currentPage === 'chatbot' ? 'tw-chat-active' : ''}`} onClick={() => navigate('/chatbot')} title="AI Chat">
        <IconChat />
      </div>
      <button onClick={() => handleNavigation('dashboard')} className={`tw-nav-tab ${isActive('dashboard') ? 'tw-active' : ''}`}>
        <IconDashboard /> Dashboard
      </button>
      <button onClick={() => handleNavigation('salesorders')} className={`tw-nav-tab ${isActive('salesorders') ? 'tw-active' : ''}`}>
        <IconSalesOrders /> Sales Orders
      </button>
      <button onClick={() => handleNavigation('workorders')} className={`tw-nav-tab ${isActive('workorders') ? 'tw-active' : ''}`}>
        <IconWorkOrders /> Work Orders
      </button>
      <button onClick={() => handleNavigation('partnumbers')} className={`tw-nav-tab ${isActive('parts') ? 'tw-active' : ''}`}>
        <IconPartNumbers /> Part Numbers
      </button>
      <button onClick={() => handleNavigation('blockers')} className={`tw-nav-tab ${isActive('blockers') ? 'tw-active' : ''}`}>
        <IconBlockers /> Blockers
      </button>
      <button onClick={() => handleNavigation('reporting')} className={`tw-nav-tab ${isActive('reporting') ? 'tw-active' : ''}`}>
        <IconReporting /> Reporting
      </button>
      {isPowerUser && (
        <button onClick={() => handleNavigation('usermanagement')} className={`tw-nav-tab ${isActive('usermanagement') ? 'tw-active' : ''}`}>
          <IconUsers /> User Management
        </button>
      )}
      <button onClick={logout} className="tw-nav-tab tw-nav-logout">
        <IconLogout /> Logout
      </button>
    </nav>
  );
};

export default Navbar;
