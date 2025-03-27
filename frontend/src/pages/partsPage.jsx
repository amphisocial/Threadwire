import React, { useState, useEffect } from 'react';
import NavBar from '../comps/NavBar';
import PartsTable from '../comps/PartsTable';
import PartDetailsModal from '../comps/PartDetailsModal';
import ImportPartModal from '../comps/ImportPartModal';
import BlockerPartsModal from '../comps/BlockerPartsModal';

import './parts.css';

const PartsPage = () => {
  const [selectedPart, setSelectedPart] = useState(null);
  const [showImportPartModal, setShowImportPartModal] = useState(false);
  const [showBlockerPartsModal, setShowBlockerPartsModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isEditingBlocker, setIsEditingBlocker] = useState(false);
  const [parts, setParts] = useState([]);
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

  const fetchParts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/parts', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch parts');
      }
      
      const data = await response.json();
      setParts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching parts:', error);
      setError(error.message);
      setParts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePartSelect = (part) => {
    setSelectedPart(part);
    setShowDetailsModal(true);
  };

  const handleBlockerAction = (isEditing) => {
    setIsEditingBlocker(isEditing);
    setShowBlockerPartsModal(true);
    setShowDetailsModal(false);
  };

  const handleBlockerClose = () => {
    setShowBlockerPartsModal(false);
    setShowDetailsModal(true);
  };

  useEffect(() => {
    document.title = 'Parts';
  }, []);

  return (
    <div className="pm-container">
      <NavBar />
      <div className="pm-header">
        <h2>Parts Management</h2>
        <button
          className="wo-import-button"
          onClick={() => setShowImportPartModal(true)}
        >
          Import Parts
        </button>
      </div>

      <PartsTable
        selectedPart={selectedPart}
        onSelectPart={handlePartSelect}
      />

      {showDetailsModal && (
        <PartDetailsModal
          part={selectedPart}
          onClose={() => setShowDetailsModal(false)}
          onAddBlocker={() => handleBlockerAction(false)}
          onEditBlocker={() => handleBlockerAction(true)}
        />
      )}

      {showImportPartModal && (
        <ImportPartModal
          onClose={() => setShowImportPartModal(false)}
        />
      )}

      {showBlockerPartsModal && (
        <BlockerPartsModal
          isEditing={isEditingBlocker}
          part={selectedPart}
          onClose={handleBlockerClose}
        />
      )}
    </div>
  );
};

export default PartsPage;
