import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { useAuth } from '../context/authContext';
import './login.css';
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    useEffect(() => {
        document.title = 'Login';
    }, []);

    const navigate = useNavigate();

    const [toast, setToast] = useState({ show: false, type: '', message: '' });

    const showToast = (type, message) => {
        setToast({ show: true, type, message });
        setTimeout(() => {
            setToast({ show: false, type: '', message: '' });
        }, 3000);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/user/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'

                },
                body: JSON.stringify(formData),
            });
            const data = await response.json();

            if (!response.ok) {
                showToast('error', data.error || data.message || 'Login failed');
            } else {
                showToast('success', 'Login successful!');
                if (data.token) {
                    if (data.token) {
                        login(data.token);
                        localStorage.setItem('userId', data.userId);
                        localStorage.setItem('username', data.username);

                    }
                    setTimeout(() => {
                        navigate('/chatbot');
                    }, 1000);
                }
            }
        } catch (err) {
            console.error('Login error:', err);
            showToast('error', 'Connection error. Please try again.');
        }
    };

    const handleGoogleSuccess = async (response) => {
        try {
            // Get invitation token from URL if present
            const urlParams = new URLSearchParams(location.search);
            const invitationToken = urlParams.get('token');

            // Build the URL with registration flag
            const authUrl = invitationToken
                ? `/api/auth/google?registration=true&token=${invitationToken}`
                : "/api/auth/google?registration=true";

            // Send the Google credential to our backend
            const res = await fetch(authUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: response.credential }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.message) {
                    showToast('error', data.message);
                } else {
                    showToast('error', 'Google authentication failed');
                }
            } else {
                // Show appropriate message based on whether it's login or registration
                if (data.isNewUser) {
                    showToast('success', 'Account created successfully!');
                } else {
                    showToast('success', 'Login successful!');
                }

                // Store token and update auth context
                await login(data.token, false); // false because we're using JWT tokens

                // Check if profile is complete
                if (data.isProfileComplete) {
                    // If profile is complete, navigate to home
                    setTimeout(() => {
                        navigate('/chatbot');
                    }, 1000);
                } else {
                    // If profile is incomplete, navigate to profile completion page
                    setTimeout(() => {
                        navigate(`/complete-profile/${data.userId}`);
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Google auth error:', error);
            showToast('error', "Google authentication failed. Try again.");
        }
    };

    
    return (
        <div className="rootclass">
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

            <header className="header">
                <a href="/" className="header-logo">
                    Threadwire
                </a>
            </header>

            <div className="container">
                <h2>Login</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button type="submit">Login</button>
                </form>

                <div className="divider">Or</div>

                <GoogleOAuthProvider clientId="597032685964-tstm86dpp6ds4j9qiknm8enhiigt6j6r.apps.googleusercontent.com">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => showToast('error', "Google Sign-In failed")}
                    />
                </GoogleOAuthProvider>

                <div className="register-link">
                    Don't have an account? <a href="/app/register">Register here</a>
                </div>
            </div>

            <footer className="footer">
                <div className="footer-copyright">
                    © 2025 Threadwire. All rights reserved.
                </div>
                <div className="footer-social">
                    <a href="https://twitter.com" className="social-icon" target="_blank" rel="noopener noreferrer">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                        </svg>
                    </a>
                    <a href="https://linkedin.com" className="social-icon" target="_blank" rel="noopener noreferrer">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                    </a>
                </div>
            </footer>
        </div>
    );
};

export default LoginForm;
