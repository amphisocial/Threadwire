import React, { useState, useEffect } from 'react';
import Navbar from '../comps/NavBar';
import BlockersTable from '../comps/BlockersTable';
import ActionItemsTable from '../comps/ActionItemsTable';
import './salesOrders.css';

const BlockersApp = () => {
  const [blockers, setBlockers] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [selectedBlocker, setSelectedBlocker] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {  
    loadBlockers();
    document.title = 'Blockers';
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(isGoogleAuth && { 'Auth-Type': 'google' }),
    };
  };

  const loadBlockers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/blockers", {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch blockers');
      }
      const data = await response.json();
      console.log('Loaded blockers:', data);
      setBlockers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading blockers:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadActionItems = async (blockerId) => {
    if (!blockerId) {
      setActionItems([]);
      return;
    }

    try {
      const response = await fetch(`/api/action-items/blocker/${blockerId}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch action items');
      }
      const data = await response.json();
      setActionItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading action items:", error);
      setActionItems([]);
    }
  };

  const handleBlockerSelect = (blocker) => {
    setSelectedBlocker(blocker);
    loadActionItems(blocker._id);
  };

  const handleBlockerUpdate = async (blockerId, updatedData) => {
    try {
      const response = await fetch(`/api/blockers/${blockerId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ _id: blockerId, ...updatedData }),
      });

      if (!response.ok) {
        throw new Error("Failed to save blocker");
      }

      alert("Blocker saved successfully.");
      loadBlockers();
    } catch (error) {
      console.error("Error saving blocker:", error);
      alert("Error saving blocker");
    }
  };

  const handleActionUpdate = async (actionId, updatedData) => {
    try {
      const response = await fetch(`/api/action-items/${actionId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error("Failed to save action item");
      }

      alert("Action item saved successfully.");
      if (selectedBlocker) {
        loadActionItems(selectedBlocker._id);
      }
    } catch (error) {
      console.error("Error saving action item:", error);
      alert("Error saving action item");
    }
  };

  return (
    <div className="app-container">
      <Navbar />
      <div className="blocker-container">
        <div>
          <h2>Blockers</h2>
          {error && (
            <div className="error-message">
              Error loading blockers: {error}
            </div>
          )}
          {isLoading ? (
            <div className="loading-message">Loading blockers...</div>
          ) : (
            <BlockersTable 
              blockers={blockers}
              selectedBlocker={selectedBlocker}
              onBlockerSelect={handleBlockerSelect}
              onBlockerUpdate={handleBlockerUpdate}
            />
          )}
        </div>
        
        <div className="right-pane">
          {selectedBlocker && (
            <div className="blocker-details">
              <h2>Blocker Details</h2>
              <div className="detail-item">
                <strong>Title:</strong> {selectedBlocker.title}
              </div>
              <div className="detail-item">
                <strong>Type:</strong> {selectedBlocker.type}
              </div>
              <div className="detail-item">
                <strong>Description:</strong> {selectedBlocker.description}
              </div>
              <div className="detail-item">
                <strong>Status:</strong> {selectedBlocker.status}
              </div>
              <div className="detail-item">
                <strong>Priority:</strong> {selectedBlocker.priority}
              </div>
              
              <div className="detail-item">
                <strong>Origin:</strong>
                <ul className="origin-list">
                  {selectedBlocker.relatedWorkOrders && selectedBlocker.relatedWorkOrders.length > 0 && (
                    <li>
                      <strong>Work Orders:</strong>
                      <ul>
                        {selectedBlocker.relatedWorkOrders.map(woId => (
                          <li key={woId}>{woId}</li>
                        ))}
                      </ul>
                    </li>
                  )}
                  
                  {selectedBlocker.relatedSalesOrders && selectedBlocker.relatedSalesOrders.length > 0 && (
                    <li>
                      <strong>Sales Orders:</strong>
                      <ul>
                        {selectedBlocker.relatedSalesOrders.map(soId => (
                          <li key={soId}>{soId}</li>
                        ))}
                      </ul>
                    </li>
                  )}
                  
                  {selectedBlocker.relatedParts && selectedBlocker.relatedParts.length > 0 && (
                    <li>
                      <strong>Parts:</strong>
                      <ul>
                        {selectedBlocker.relatedParts.map(partId => (
                          <li key={partId}>{partId}</li>
                        ))}
                      </ul>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
          
          <h2>Action Items</h2>
          <ActionItemsTable 
            actionItems={actionItems}
            onActionUpdate={handleActionUpdate}
          />
        </div>
      </div>
    </div>
  );
};

export default BlockersApp;
