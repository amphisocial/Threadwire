/**
 * =============================================================================
 * ThreadWire Main Application Component
 * =============================================================================
 * Root component that sets up routing and authentication for the entire app.
 * 
 * Features:
 * - React Router for client-side navigation
 * - AuthProvider for global authentication state
 * - ProtectedRoute wrapper for authenticated pages
 * 
 * Routes:
 * - Public: /, /login, /register, /complete-profile/:userId
 * - Protected: /home (CalendarView - default dashboard), /salesorders,
 *              /workorders, /parts, /blockers, /visualization, /chatbot,
 *              /user-management, /calendar
 * 
 * CHANGE LOG:
 * - Feb 10, 2026: Made CalendarView the default dashboard at /home route
 * - Jan 12, 2026: Added CalendarView at /calendar route
 * 
 * Base Path: /app (React app is served from /app subdirectory)
 * =============================================================================
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sample from './components/Sample.jsx';
import { AuthProvider } from './context/authContext';
import ProtectedRoute from './context/ProtectedRoute';

// Page Imports - Public Pages
import RegistrationForm from "./pages/register";
import LoginForm from "./pages/login";
import ProfileCompletion from './pages/profileCompletion.jsx';

// Page Imports - Protected Pages
import LandingPage from "./pages/landingPage";
import SalesOrdersApp from "./pages/salesOrders.jsx";
import BlockersApp from "./pages/blockers.jsx";
import GraphView from "./pages/graphView.jsx";
import PartsPage from "./pages/partsPage.jsx";
import WorkOrders from "./pages/workOrders.jsx";
import Chatbot from './pages/chatbot.jsx';
import UserManagement from "./pages/userManagement.jsx";
import CalendarView from "./pages/calendarView.jsx";

function App() {
  return (
    <AuthProvider>
      <Router basename="/app">
        <Routes>
          {/* ===== Public Routes ===== */}
          <Route path="/Sample" element={<Sample />} />
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/register" element={<RegistrationForm />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/complete-profile/:userId" element={<ProfileCompletion />} />

          {/* ===== Protected Routes (Require Authentication) ===== */}
          
          {/* 
            Home/Dashboard - Now renders CalendarView as the default view
            Changed: Feb 10, 2026 - CalendarView replaces LandingPage as default
          */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <CalendarView />
              </ProtectedRoute>
            }
          />

          {/* 
            Legacy Cards View - LandingPage with CardsGrid still accessible
            Kept for backward compatibility in case owner wants to toggle views
          */}
          <Route
            path="/dashboard-cards"
            element={
              <ProtectedRoute>
                <LandingPage />
              </ProtectedRoute>
            }
          />

          {/* Sales Orders Management */}
          <Route
            path="/salesorders"
            element={
              <ProtectedRoute>
                <SalesOrdersApp />
              </ProtectedRoute>
            }
          />

          {/* Blockers/Risk Issues Management */}
          <Route
            path="/blockers"
            element={
              <ProtectedRoute>
                <BlockersApp />
              </ProtectedRoute>
            }
          />

          {/* Graph Visualization */}
          <Route
            path="/visualization"
            element={
              <ProtectedRoute>
                <GraphView />
              </ProtectedRoute>
            }
          />

          {/* Parts Inventory Management */}
          <Route
            path="/parts"
            element={
              <ProtectedRoute>
                <PartsPage />
              </ProtectedRoute>
            }
          />

          {/* Work Orders Management */}
          <Route
            path="/workorders"
            element={
              <ProtectedRoute>
                <WorkOrders />
              </ProtectedRoute>
            }
          />

          {/* AI Chatbot */}
          <Route
            path="/chatbot"
            element={
              <ProtectedRoute>
                <Chatbot />
              </ProtectedRoute>
            }
          />

          {/* User Management (Admin) */}
          <Route
            path="/user-management"
            element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            }
          />

          {/* Calendar View - Also accessible directly (kept for backward compat) */}
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarView />
              </ProtectedRoute>
            }
          />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
