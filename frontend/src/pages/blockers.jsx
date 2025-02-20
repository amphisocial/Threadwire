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
        <div className="left-pane">
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
