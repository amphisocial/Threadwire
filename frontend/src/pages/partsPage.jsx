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
          className="pm-import-button"
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
