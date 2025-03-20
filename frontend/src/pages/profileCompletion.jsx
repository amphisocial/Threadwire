import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import './register.css'; 

const ProfileCompletion = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    userName: '',
    phone: '',
    customerId: ''
  });
  
  const [companies, setCompanies] = useState([]);
  const [countryCode, setCountryCode] = useState('+1');
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [companySearch, setCompanySearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const suggestionRef = useRef(null);

  const countryCodes = [
    { code: '+1', country: 'US' },
    { code: '+44', country: 'UK' },
    { code: '+91', country: 'IN' },
    { code: '+61', country: 'AU' },
    { code: '+86', country: 'CN' },
    { code: '+81', country: 'JP' },
    { code: '+49', country: 'DE' },
    // Add more country codes as needed
  ];

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast({ show: false, type: '', message: '' });
    }, 3000);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.title = 'Complete Your Profile';
    
    // Check authentication after loading is complete
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    
    // Fetch companies
    const fetchCompanies = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/user/companies', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setCompanies(data);
      } catch (err) {
        showToast('error', 'Failed to fetch companies: ' + err.message);
      }
    };
    
    if (isAuthenticated) {
      fetchCompanies();
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleCompanySearch = (e) => {
    const searchTerm = e.target.value;
    setCompanySearch(searchTerm);

    const filtered = companies.filter(company =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCompanies(filtered);
    setShowSuggestions(true);
  };

  const handleCompanySelect = (company) => {
    setCompanySearch(company.name);
    setFormData({ ...formData, customerId: company._id });
    setShowSuggestions(false);
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
      // Format the phone number with country code
      const formDataWithCountryCode = {
        ...formData,
        phone: `${countryCode}${formData.phone}`
      };
      
      const token = localStorage.getItem('authToken');
      const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
      
      // Send the request to complete the profile
      const response = await fetch(`/api/user/complete-profile/${userId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(isGoogleAuth && { 'Auth-Type': 'google' })
        },
        body: JSON.stringify(formDataWithCountryCode),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast('error', data.error || data.message || 'Profile completion failed');
      } else {
        showToast('success', 'Profile completed successfully!');
        
        // Navigate to home after successful profile completion
        setTimeout(() => {
          navigate('/home');
        }, 2000);
      }
    } catch (err) {
      showToast('error', 'Connection error. Please try again.');
    }
  };

  // Show loading indicator while checking authentication
  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

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
        <h2>Complete Your Profile</h2>
        
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              name="userName" 
              value={formData.userName} 
              onChange={handleChange} 
              required 
              placeholder="Username"
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <div className="phone-input-container">
             <select
                className="country-code-select"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              >
                {countryCodes.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.code} {country.country}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="phone-input"
                required
                placeholder="Phone number"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Company</label>
            <div className="company-search-container" ref={suggestionRef}>
              <input
                type="text"
                value={companySearch}
                onChange={handleCompanySearch}
                placeholder="Search for a company..."
                className="company-search-input"
                required
              />
              {showSuggestions && filteredCompanies.length > 0 && (
                <div className="company-suggestions">
                  {filteredCompanies.map((company) => (
                    <div
                      key={company._id}
                      className="company-suggestion-item"
                      onClick={() => handleCompanySelect(company)}
                    >
                      {company.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button type="submit">Complete Profile</button>
        </form>
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

export default ProfileCompletion;
