// components/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Navbar from '../comps/NavBar';
import ApiTokenManagement from '../comps/ApiTokenManagement';
import ApiAnalytics from '../comps/ApiAnalytics';
import './userManagement.css';

const UserManagement = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isPowerUser, isLoading, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [resendingInvitation, setResendingInvitation] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

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
      fetchPendingInvitations();
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

  const fetchPendingInvitations = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const isGoogleAuth = localStorage.getItem('isGoogleAuth');

      const response = await fetch('/api/user/invitations/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(isGoogleAuth && { 'Auth-Type': 'google' }),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending invitations');
      }

      const data = await response.json();
      setPendingInvitations(data.invitations);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      // Don't show toast for this - it's not critical
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

  const handleResendInvitation = async (invitationId) => {
    try {
      setResendingInvitation(invitationId);
      const token = localStorage.getItem('authToken');
      const isGoogleAuth = localStorage.getItem('isGoogleAuth');

      const response = await fetch(`/api/user/invitations/${invitationId}/resend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(isGoogleAuth && { 'Auth-Type': 'google' }),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resend invitation');
      }

      showToast('success', 'Invitation resent successfully');
      fetchPendingInvitations();
    } catch (error) {
      showToast('error', error.message);
    } finally {
      setResendingInvitation(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      setDeletingUser(userId);
      const token = localStorage.getItem('authToken');
      const isGoogleAuth = localStorage.getItem('isGoogleAuth');

      const response = await fetch(`/api/user/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(isGoogleAuth && { 'Auth-Type': 'google' }),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      showToast('success', 'User deleted successfully');
      setShowDeleteConfirm(null);
      fetchCompanyUsers(); // Refresh the user list
    } catch (error) {
      showToast('error', error.message);
    } finally {
      setDeletingUser(null);
    }
  };

  const confirmDeleteUser = (userToDelete) => {
    setShowDeleteConfirm(userToDelete);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
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
  const currentUserId = user?.userId || user?.id;

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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirm Delete</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete user <strong>{showDeleteConfirm.firstName} {showDeleteConfirm.lastName}</strong>?
              </p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={cancelDelete}
                disabled={deletingUser === showDeleteConfirm._id}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => handleDeleteUser(showDeleteConfirm._id)}
                disabled={deletingUser === showDeleteConfirm._id}
              >
                {deletingUser === showDeleteConfirm._id ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="management-container">
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

                {pendingInvitations && pendingInvitations.length > 0 && (
                  <div className="section">
                    <h3>Pending Invitations</h3>
                    <div className="table-responsive">
                      <table className="users-table">
                        <thead>
                          <tr>
                            <th>Email</th>
                            <th>Invited On</th>
                            <th>Expires</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingInvitations.map(invitation => (
                            <tr key={invitation._id}>
                              <td>{invitation.email}</td>
                              <td>{new Date(invitation.createdAt).toLocaleDateString()}</td>
                              <td>{new Date(invitation.expiresAt).toLocaleDateString()}</td>
                              <td>
                                <button
                                  className="resend-button"
                                  onClick={() => handleResendInvitation(invitation._id)}
                                  disabled={resendingInvitation === invitation._id}
                                >
                                  {resendingInvitation === invitation._id ? 'Sending...' : 'Resend'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

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
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(userItem => (
                            <tr key={userItem._id}>
                              <td>{userItem.firstName} {userItem.lastName}</td>
                              <td>{userItem.userName}</td>
                              <td>{userItem.email}</td>
                              <td>
                                <span className={userItem.role === 'power_user' ? 'badge admin' : 'badge user'}>
                                  {userItem.role === 'power_user' ? 'Admin' : 'User'}
                                </span>
                              </td>
                              <td>{new Date(userItem.createdAt).toLocaleDateString()}</td>
                              <td>
                                {/* Only show delete button for regular users, not for the current power user */}
                                {userItem.role === 'regular_user' && userItem._id !== currentUserId ? (
                                  <button
                                    className="delete-button"
                                    onClick={() => confirmDeleteUser(userItem)}
                                    disabled={deletingUser === userItem._id}
                                    title="Delete User"
                                  >
                                    {deletingUser === userItem._id ? 'Deleting...' : '🗑️'}
                                  </button>
                                ) : (
                                  <span className="no-actions">—</span>
                                )}
                              </td>
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