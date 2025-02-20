import React, { useState, useEffect } from 'react';
import Navbar from '../comps/NavBar';
import SalesOrdersTable from '../comps/SalesOrdersTable';
import BlockerModal from '../comps/BlockerModal';
import ImportModal from '../comps/ImportModal';
import './salesOrders.css';

const SalesOrdersApp = () => {
  const [selectedSalesOrder, setSelectedSalesOrder] = useState(null);
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentBlockerId, setCurrentBlockerId] = useState(null);
  const [salesOrders, setSalesOrders] = useState([]); // Initialize as empty array
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);


  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(isGoogleAuth && { 'Auth-Type': 'google' }),
    };
  };

  useEffect(() => {
    loadSalesOrders();
  }, []);

  const loadSalesOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/salesorders", {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch sales orders');
      }
      const data = await response.json();
      setSalesOrders(Array.isArray(data) ? data : []); // Ensure it's an array
    } catch (error) {
      console.error("Error loading sales orders:", error);
      setError(error.message);
      setSalesOrders([]); // Set to empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRiskIssue = () => {
    if (!selectedSalesOrder) {
      alert("Please select a Sales Order row first.");
      return;
    }
    setCurrentBlockerId(null);
    setShowBlockerModal(true);
  };

  const handleEditRiskIssue = async () => {
    if (!selectedSalesOrder) {
      alert("Please select a Sales Order row first.");
      return;
    }

    try {
      const res = await fetch(`/api/blockers?relatedSalesOrders=${selectedSalesOrder.salesOrderId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const blockers = await res.json();

      if (!blockers || blockers.length === 0) {
        alert("No existing Risk/Issue found for this Sales Order.");
        return;
      }

      setCurrentBlockerId(blockers[0]._id);
      setShowBlockerModal(true);
    } catch (err) {
      console.error("Error finding blockers:", err);
      alert("Failed to find risk/issue for this Sales Order.");
    }
  };

  return (
    <div className="app-container">
      <Navbar />
      <div className="content-container">
        <h2>Sales Orders</h2>
        <div className="button-group">
          <button 
            onClick={handleAddRiskIssue}
            className="btn btn-primary"
          >
            + Add Risk/Issue
          </button>
          <button 
            onClick={handleEditRiskIssue}
            className="btn btn-primary"
          >
            Edit Risk/Issue
          </button>
          <button 
            onClick={() => setShowImportModal(true)}
            className="btn btn-success"
          >
            Import CSV
          </button>
        </div>

        {error && (
          <div className="error-message">
            Error loading sales orders: {error}
          </div>
        )}

        {isLoading ? (
          <div className="loading-message">Loading sales orders...</div>
        ) : (
          <SalesOrdersTable 
            salesOrders={salesOrders}
            selectedSalesOrder={selectedSalesOrder}
            onSelectSalesOrder={setSelectedSalesOrder}
            onUpdateSalesOrders={loadSalesOrders}
          />
        )}

        {showBlockerModal && (
          <BlockerModal
            blockerId={currentBlockerId}
            salesOrderId={selectedSalesOrder?.salesOrderId}
            onClose={() => setShowBlockerModal(false)}
            onSave={() => {
              setShowBlockerModal(false);
              loadSalesOrders();
            }}
          />
        )}

        {showImportModal && (
          <ImportModal
            onClose={() => setShowImportModal(false)}
            onImportComplete={loadSalesOrders}
          />
        )}
      </div>
    </div>
  );
};

export default SalesOrdersApp;