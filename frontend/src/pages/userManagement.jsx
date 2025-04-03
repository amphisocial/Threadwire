// components/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Navbar from '../comps/NavBar';
import './userManagement.css';

const UserManagement = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isPowerUser, isLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    document.title = 'User Management';
    
    // Check authentication and power user status
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      
      if (!isPowerUser) {
        showToast('error', 'Access denied. Only admins can view this page.');
        setTimeout(() => {
          navigate('/home');
        }, 2000);
        return;
      }
      
      fetchCompanyUsers();
    }
  }, [isLoading, isAuthenticated, isPowerUser, navigate]);

  const fetchCompanyUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const isGoogleAuth = localStorage.getItem('isGoogleAuth');
      
      const response = await fetch('/api/user/company-users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(isGoogleAuth && { 'Auth-Type': 'google' }),
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch company users');
      }
      
      const data = await response.json();
      setUsers(data.users);
      setCompanyInfo(data.company);
      setLoading(false);
    } catch (error) {
      showToast('error', error.message || 'Failed to load company information');
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast({ show: false, type: '', message: '' });
    }, 3000);
  };

  if (isLoading || loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app-container">
      <Navbar />
      
      {toast.show && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <div className="toast-content">
              <div className="toast-title">
                {toast.type === 'success' ? 'Success' : 'Error'}
              </div>
              <div className="toast-message">{toast.message}</div>
            </div>
            <button
              className="toast-close"
              onClick={() => setToast({ show: false, type: '', message: '' })}
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <div className="content-container">
        <h2>User Management</h2>
        
        {companyInfo && (
          <div className="company-info-card">
            <h3>{companyInfo.name}</h3>
            <div className="company-info-stats">
              <div className="stat-item">
                <span className="stat-label">Users:</span>
                <span className="stat-value">{companyInfo.currentUserCount} / {companyInfo.maxUsers}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">License:</span>
                <span className="stat-value">{companyInfo.licenseType}</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="section">
          <h2>Company Users</h2>
          {users.length > 0 ? (
            <div className="table-responsive">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id}>
                      <td>{user.firstName} {user.lastName}</td>
                      <td>{user.userName}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={user.role === 'power_user' ? 'badge admin' : 'badge user'}>
                          {user.role === 'power_user' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-data-message">No users found for this company.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
