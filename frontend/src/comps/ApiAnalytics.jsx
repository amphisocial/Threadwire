import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/authContext';

const ApiAnalytics = ({ showToast }) => {
  const { isAuthenticated, isPowerUser } = useAuth();
  const [usageData, setUsageData] = useState([]);
  const [usageSummary, setUsageSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isAuthenticated && isPowerUser) {
      fetchApiUsageData();
    }
  }, [isAuthenticated, isPowerUser]);

  const fetchApiUsageData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const isGoogleAuth = localStorage.getItem('isGoogleAuth');
      const { startDate, endDate } = dateRange;
      
      // Fetch detailed usage data
      const usageResponse = await fetch(`/api/analytics/usage?startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(isGoogleAuth && { 'Auth-Type': 'google' }),
          'Content-Type': 'application/json'
        }
      });
      
      if (!usageResponse.ok) {
        throw new Error('Failed to fetch API usage data');
      }
      
      const usageResult = await usageResponse.json();
      setUsageData(usageResult);
      
      // Fetch summary data
      const summaryResponse = await fetch(`/api/analytics/summary?startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(isGoogleAuth && { 'Auth-Type': 'google' }),
          'Content-Type': 'application/json'
        }
      });
      
      if (!summaryResponse.ok) {
        throw new Error('Failed to fetch API usage summary');
      }
      
      const summaryResult = await summaryResponse.json();
      setUsageSummary(summaryResult);
      
    } catch (error) {
      showToast('error', error.message || 'Failed to load API analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
  };

  const getTotalRequests = () => {
    return usageSummary.reduce((total, item) => total + item.count, 0);
  };

  const getSuccessRate = () => {
    const totalRequests = getTotalRequests();
    const successfulRequests = usageSummary.reduce((total, item) => total + item.successCount, 0);
    return totalRequests ? Math.round((successfulRequests / totalRequests) * 100) + '%' : 'N/A';
  };

  const getAvgResponseTime = () => {
    const totalTime = usageSummary.reduce((total, item) => total + (item.avgResponseTime * item.count), 0);
    const totalRequests = getTotalRequests();
    return totalRequests ? Math.round(totalTime / totalRequests) + 'ms' : 'N/A';
  };

  if (loading && !usageData.length && !usageSummary.length) {
    return <div className="loading">Loading API analytics...</div>;
  }

  return (
    <div className="api-analytics">
      <h3>API Usage Analytics</h3>
      <p className="section-description">
        Monitor and analyze how your API tokens are being used.
      </p>
      
      <div className="date-filter">
        <div className="form-group">
          <label htmlFor="startDate">Start Date</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={dateRange.startDate}
            onChange={handleDateChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="endDate">End Date</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={dateRange.endDate}
            onChange={handleDateChange}
          />
        </div>
        
        <button onClick={fetchApiUsageData} className="filter-button">Apply Filter</button>
      </div>
      
      {/* Summary Statistics */}
      {usageSummary.length > 0 ? (
        <>
          <div className="summary-section">
            <h4>Usage Overview</h4>
            
            <div className="summary-cards">
              <div className="card total-requests">
                <h5>Total API Requests</h5>
                <div className="card-value">{getTotalRequests()}</div>
              </div>
              
              <div className="card success-rate">
                <h5>Success Rate</h5>
                <div className="card-value">{getSuccessRate()}</div>
              </div>
              
              <div className="card avg-response-time">
                <h5>Avg Response Time</h5>
                <div className="card-value">{getAvgResponseTime()}</div>
              </div>
            </div>
          </div>
          
          <div className="endpoints-section">
            <h4>Endpoint Usage</h4>
            <div className="table-responsive">
              <table className="endpoints-table">
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>Method</th>
                    <th>Requests</th>
                    <th>Success Rate</th>
                    <th>Avg Response Time</th>
                  </tr>
                </thead>
                <tbody>
                  {usageSummary.map((endpoint, index) => (
                    <tr key={index}>
                      <td>{endpoint._id.endpoint}</td>
                      <td>{endpoint._id.method}</td>
                      <td>{endpoint.count}</td>
                      <td>{Math.round((endpoint.successCount / endpoint.count) * 100)}%</td>
                      <td>{Math.round(endpoint.avgResponseTime)}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="no-data-container">
          <p className="no-data-message">No API usage data available for the selected period.</p>
        </div>
      )}
      
      {/* Recent API Calls */}
      {usageData.length > 0 && (
        <div className="recent-calls-section">
          <h4>Recent API Calls</h4>
          <div className="table-responsive">
            <table className="calls-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Endpoint</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Token</th>
                  <th>Response Time</th>
                </tr>
              </thead>
              <tbody>
                {usageData.slice(0, 50).map((call, index) => (
                  <tr key={index} className={call.statusCode >= 400 ? 'error-row' : ''}>
                    <td>{new Date(call.createdAt).toLocaleString()}</td>
                    <td>{call.endpoint}</td>
                    <td>{call.method}</td>
                    <td>
                      <span className={`status-code status-${Math.floor(call.statusCode / 100)}xx`}>
                        {call.statusCode}
                      </span>
                    </td>
                    <td>{call.tokenName || 'Unknown'}</td>
                    <td>{call.responseTime}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiAnalytics;