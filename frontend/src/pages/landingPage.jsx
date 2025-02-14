import React from 'react';
import { useAuth } from '../context/authContext';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <header>
        <h1>Landing Page</h1>
        <button onClick={handleLogout}>Logout</button>
      </header>
    </div>
  );
};

export default LandingPage;