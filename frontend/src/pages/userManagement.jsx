// components/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Navbar from '../comps/NavBar';
import ApiTokenManagement from '../comps/ApiTokenManagement';
import './userManagement.css';

const UserManagement = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isPowerUser, isLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [activeTab, setActiveTab] = useState('users');

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

  const handleInvite = async (e) => {
    e.preventDefault();

    if (!inviteEmail.trim()) {
      showToast('error', 'Please enter an email address');
      return;
    }

    try {
      setInviting(true);
      const token = localStorage.getItem('authToken');
      const isGoogleAuth = localStorage.getItem('isGoogleAuth');

      const response = await fetch('/api/user/invitations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(isGoogleAuth && { 'Auth-Type': 'google' }),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: inviteEmail })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invitation');
      }

      showToast('success', `Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      fetchCompanyUsers();
    } catch (error) {
      showToast('error', error.message);
    } finally {
      setInviting(false);
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

  const canInviteMore = companyInfo && companyInfo.currentUserCount < companyInfo.maxUsers;


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
        <h2>Company Management</h2>

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

        <div className="tabs-container">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Users
            </button>
            <button
              className={`tab ${activeTab === 'api-tokens' ? 'active' : ''}`}
              onClick={() => setActiveTab('api-tokens')}
            >
              API Tokens
            </button>
            <button
              className={`tab ${activeTab === 'api-analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('api-analytics')}
            >
              API Analytics
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'users' && (
              <>
                <div className="section invite-section">
                  <h3>Invite New User</h3>
                  <form onSubmit={handleInvite} className="invite-form">
                    <div className="form-group">
                      <label htmlFor="inviteEmail">Email Address</label>
                      <div className="input-group">
                        <input
                          type="email"
                          id="inviteEmail"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="Enter email address"
                          disabled={!canInviteMore || inviting}
                          required
                        />
                        <button
                          type="submit"
                          className="invite-button"
                          disabled={!canInviteMore || inviting || !inviteEmail.trim()}
                        >
                          {inviting ? 'Sending...' : 'Send Invitation'}
                        </button>
                      </div>
                      {!canInviteMore && (
                        <p className="limit-warning">
                          You've reached your user limit. Please upgrade your plan to add more users.
                        </p>
                      )}
                    </div>
                  </form>
                </div>

                <div className="section">
                  <h3>Company Users</h3>
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
              </>
            )}

            {activeTab === 'api-tokens' && (
              <ApiTokenManagement showToast={showToast} />
            )}

            {activeTab === 'api-analytics' && (
              <ApiAnalytics showToast={showToast} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
