// components/ApiTokenManagement.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/authContext';

const ApiTokenManagement = () => {
    const { isAuthenticated, isPowerUser } = useAuth();
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newToken, setNewToken] = useState({ name: '', scopes: [] });
    const [createdToken, setCreatedToken] = useState(null);
    const [error, setError] = useState('');

    const availableScopes = [
        { name: 'read:data', description: 'Read data from the API' },
        { name: 'write:data', description: 'Write data to the API' },
        { name: 'delete:data', description: 'Delete data from the API' },
        { name: 'admin', description: 'Full access to all API endpoints' }
    ];

    useEffect(() => {
        if (isAuthenticated && isPowerUser) {
            fetchTokens();
        }
    }, [isAuthenticated, isPowerUser]);

    const fetchTokens = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');
            const isGoogleAuth = localStorage.getItem('isGoogleAuth');

            const response = await fetch('/api/tokens', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...(isGoogleAuth && { 'Auth-Type': 'google' }),
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch API tokens');
            }

            const data = await response.json();
            setTokens(data);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateToken = async (e) => {
        e.preventDefault();

        if (!newToken.name) {
            setError('Token name is required');
            return;
        }

        if (newToken.scopes.length === 0) {
            setError('At least one scope must be selected');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const isGoogleAuth = localStorage.getItem('isGoogleAuth');

            const response = await fetch('/api/tokens', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...(isGoogleAuth && { 'Auth-Type': 'google' }),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newToken)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create token');
            }

            const data = await response.json();

            // Store the created token (with the actual token value)
            setCreatedToken(data);

            // Reset form
            setNewToken({ name: '', scopes: [], expiresIn: '90' });

            // Refresh token list
            fetchTokens();

            setError('');
        } catch (error) {
            setError(error.message);
        }
    };

    const handleRevokeToken = async (tokenId) => {
        if (!confirm('Are you sure you want to revoke this token? This action cannot be undone.')) {
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const isGoogleAuth = localStorage.getItem('isGoogleAuth');

            const response = await fetch(`/api/tokens/${tokenId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...(isGoogleAuth && { 'Auth-Type': 'google' }),
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to revoke token');
            }

            // Refresh token list
            fetchTokens();
        } catch (error) {
            setError(error.message);
        }
    };

    const handleScopeChange = (scope) => {
        const currentScopes = [...newToken.scopes];
        if (currentScopes.includes(scope)) {
            setNewToken({
                ...newToken,
                scopes: currentScopes.filter(s => s !== scope)
            });
        } else {
            setNewToken({
                ...newToken,
                scopes: [...currentScopes, scope]
            });
        }
    };

    if (loading && tokens.length === 0) {
        return <div className="loading">Loading API tokens...</div>;
    }

    return (
        <div className="api-token-management">
            <h2>API Token Management</h2>

            {error && <div className="error-message">{error}</div>}

            {createdToken && (
                <div className="token-created-alert">
                    <h3>New API Token Created</h3>
                    <p className="token-warning">
                        Make sure to copy your token now. You won't be able to see it again!
                    </p>
                    <div className="token-display">
                        <code>{createdToken.token}</code>
                        <button
                            className="copy-button"
                            onClick={() => {
                                navigator.clipboard.writeText(createdToken.token);
                                alert('Token copied to clipboard');
                            }}
                        >
                            Copy
                        </button>
                    </div>
                    <div className="token-info">
                        <p><strong>Name:</strong> {createdToken.name}</p>
                        <p><strong>Scopes:</strong> {createdToken.scopes.join(', ')}</p>
                        <p><strong>Expires:</strong> {new Date(createdToken.expiresAt).toLocaleDateString()}</p>
                    </div>
                    <button
                        className="dismiss-button"
                        onClick={() => setCreatedToken(null)}
                    >
                        Dismiss
                    </button>
                </div>
            )}

            <div className="create-token-section">
                <h3>Create New API Token</h3>
                <form onSubmit={handleCreateToken}>
                    <div className="form-group">
                        <label htmlFor="tokenName">Token Name</label>
                        <input
                            type="text"
                            id="tokenName"
                            value={newToken.name}
                            onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                            placeholder="Enter a descriptive name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">API Permissions</label>
                        <div className="permissions-container">
                            {availableScopes.map((scope) => (
                                <div key={scope.name} className="permission-card">
                                    <div className="permission-header">
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={newToken.scopes.includes(scope.name)}
                                                onChange={() => handleScopeChange(scope.name)}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                        <span className="permission-name">{scope.name}</span>
                                    </div>
                                    <p className="permission-description">{scope.description}</p>
                                </div>
                            ))}
                        </div>
                        <p className="permission-help-text">
                            Select the permissions you want to grant to this API token. Choose only what's necessary for security.
                        </p>
                    </div>

                    <div className="info-note">
                        <p>All API tokens expire after 30 days for security reasons.</p>
                    </div>


                    <button type="submit" className="create-token-button">Create Token</button>
                </form>
            </div>

            <div className="tokens-list-section">
                <h3>Existing API Tokens</h3>
                {tokens.length === 0 ? (
                    <p className="no-tokens-message">No API tokens created yet.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="tokens-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Scopes</th>
                                    <th>Created</th>
                                    <th>Expires</th>
                                    <th>Last Used</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tokens.map((token) => (
                                    <tr key={token._id}>
                                        <td>{token.name}</td>
                                        <td>
                                            <div className="scopes-badges">
                                                {token.scopes.map(scope => (
                                                    <span key={scope} className="scope-badge">{scope}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>{new Date(token.createdAt).toLocaleDateString()}</td>
                                        <td>{new Date(token.expiresAt).toLocaleDateString()}</td>
                                        <td>{token.lastUsed ? new Date(token.lastUsed).toLocaleString() : 'Never'}</td>
                                        <td>
                                            <button
                                                className="revoke-button"
                                                onClick={() => handleRevokeToken(token._id)}
                                            >
                                                Revoke
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApiTokenManagement;