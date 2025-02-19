import React from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sample from './components/Sample.jsx';
import { AuthProvider } from './context/authContext';
import ProtectedRoute from './context/ProtectedRoute';
import RegistrationForm from "./pages/register";
import LoginForm from "./pages/login";
import LandingPage from "./pages/landingPage";
import SalesOrdersApp from "./pages/salesOrders.jsx";
import BlockersApp from "./pages/blockers.jsx";


function App() {
  return (
    <AuthProvider>
      <Router basename="/app">
        <Routes>
          <Route path="/Sample" element={<Sample />} />
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/register" element={<RegistrationForm />} />
          <Route path="/login" element={<LoginForm />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <LandingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/salesorders"
            element={
              <ProtectedRoute>
                <SalesOrdersApp />
              </ProtectedRoute>
            }
          />
          <Route
            path="/blockers"
            element={
              <ProtectedRoute>
                <BlockersApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>

  );
}

export default App;
