/**
 * =============================================================================
 * Blockers Page Component
 * =============================================================================
 * Main page for viewing and managing Blockers (Risk/Issues).
 * 
 * Features:
 * - List all blockers in a table with filters
 * - Select a blocker to view its details and action items
 * - Edit blockers inline
 * - Full CRUD for action items (Create, Read, Update, Delete)
 * - Close blocker functionality
 * 
 * Updated: February 2, 2026
 * - Added onBlockerUpdate callback to BlockerDetails for refresh after close
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import Navbar from '../comps/NavBar';
import BlockersTable from '../comps/BlockersTable';
import ActionItemsTable from '../comps/ActionItemsTable';
import BlockerDetails from '../comps/BlockerDetails';
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

  /**
   * Get authentication headers for API requests
   */
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(isGoogleAuth && { 'Auth-Type': 'google' }),
    };
  };

  /**
   * Load all blockers from API
   */
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

  /**
   * Load action items for a specific blocker
   */
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

  /**
   * Handle blocker selection - load its action items
   */
  const handleBlockerSelect = (blocker) => {
    setSelectedBlocker(blocker);
    loadActionItems(blocker._id);
  };

  /**
   * Handle blocker update (inline editing)
   */
  const handleBlockerUpdate = async (blockerId, updatedData) => {
    try {
      const response = await fetch(`/api/blockers/${blockerId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error("Failed to save blocker");
      }

      alert("Blocker saved successfully.");
      loadBlockers();
      
      // Refresh selected blocker data
      if (selectedBlocker && selectedBlocker._id === blockerId) {
        const updatedBlocker = await response.json();
        setSelectedBlocker(updatedBlocker);
      }
    } catch (error) {
      console.error("Error saving blocker:", error);
      alert("Error saving blocker");
    }
  };

  /**
   * Handle blocker close or update from BlockerDetails component
   * This refreshes the blockers list and clears selection
   */
  const handleBlockerRefresh = async () => {
    await loadBlockers();
    // Clear selection to force re-fetch of updated blocker
    if (selectedBlocker) {
      // Re-fetch the selected blocker to get updated data
      try {
        const response = await fetch(`/api/blockers/${selectedBlocker._id}`, {
          headers: getAuthHeaders()
        });
        if (response.ok) {
          const updatedBlocker = await response.json();
          setSelectedBlocker(updatedBlocker);
        }
      } catch (error) {
        console.error("Error refreshing selected blocker:", error);
      }
    }
  };

  /**
   * Handle action item update
   */
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
      // Also refresh blockers in case action completion closed the blocker
      loadBlockers();
    } catch (error) {
      console.error("Error saving action item:", error);
      alert("Error saving action item");
    }
  };

  /**
   * Handle action item delete
   */
  const handleActionDelete = async (actionId) => {
    try {
      const response = await fetch(`/api/action-items/${actionId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to delete action item");
      }

      alert("Action item deleted successfully.");
      if (selectedBlocker) {
        loadActionItems(selectedBlocker._id);
      }
    } catch (error) {
      console.error("Error deleting action item:", error);
      alert("Error deleting action item");
    }
  };

  /**
   * Handle action item create
   */
  const handleActionCreate = async (newActionData) => {
    if (!selectedBlocker) {
      alert("Please select a blocker first.");
      return;
    }

    try {
      const response = await fetch(`/api/action-items`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          blockerId: selectedBlocker._id,
          actionItem: newActionData.actionItem,
          assignedTo: newActionData.assignedTo,
          status: newActionData.status,
          remark: newActionData.remark,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create action item");
      }

      alert("Action item created successfully.");
      loadActionItems(selectedBlocker._id);
    } catch (error) {
      console.error("Error creating action item:", error);
      alert("Error creating action item");
    }
  };

  return (
    <div className="app-container">
      <Navbar />
      <div className="blocker-container">
        {/* Left Pane - Blockers Table */}
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
        
        {/* Right Pane - Details and Action Items */}
        <div className="right-pane">
          {/* Blocker Details with Close button and Go To Item */}
          {selectedBlocker && (
            <BlockerDetails 
              selectedBlocker={selectedBlocker}
              getAuthHeaders={getAuthHeaders}
              onBlockerUpdate={handleBlockerRefresh}
            />
          )}
          
          {/* Action Items Table */}
          <h2>Action Items</h2>
          <ActionItemsTable 
            actionItems={actionItems}
            onActionUpdate={handleActionUpdate}
            onActionDelete={handleActionDelete}
            onActionCreate={handleActionCreate}
            blockerId={selectedBlocker?._id}
          />
        </div>
      </div>
    </div>
  );
};

export default BlockersApp;
