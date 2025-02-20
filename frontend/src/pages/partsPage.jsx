import React, { useState, useEffect } from 'react';
import NavBar from '../comps/NavBar';
import PartsTable from '../comps/PartsTable';
import PartDetails from '../comps/PartDetails';
import ImportPartModal from '../comps/ImportPartModal';
import BlockerPartsModal from '../comps/BlockerPartsModal';

import './parts.css';

const PartsPage = () => {
    const [selectedPart, setSelectedPart] = useState(null);
    const [showImportPartModal, setShowImportPartModal] = useState(false);
    const [showBlockerPartsModal, setShowBlockerPartsModal] = useState(false);
    const [isEditingBlocker, setIsEditingBlocker] = useState(false);

    return (
        <div className="pm-container">
            <NavBar />
            <div className="pm-left-pane">
                <button
                    className="pm-small-button"
                    onClick={() => setShowImportPartModal(true)}
                >
                    Import Parts
                </button>

                <div style={{ marginBottom: '1rem' }}>
                    <button
                        className="pm-small-button"
                        onClick={() => {
                            if (!selectedPart) {
                                alert('Please select a part first');
                                return;
                            }
                            setIsEditingBlocker(false);
                            setShowBlockerPartsModal(true);
                        }}
                    >
                        + Add Risk/Issue
                    </button>
                    <button
                        className="pm-small-button"
                        onClick={() => {
                            if (!selectedPart) {
                                alert('Please select a part first');
                                return;
                            }
                            setIsEditingBlocker(true);
                            setShowBlockerPartsModal(true);
                        }}
                    >
                        Edit Risk/Issue
                    </button>
                </div>

                <PartsTable
                    selectedPart={selectedPart}
                    onSelectPart={setSelectedPart}
                />
            </div>

            <div className="pm-right-pane">
                <h2>Part Details</h2>
                <PartDetails part={selectedPart} />
            </div>

            {showImportPartModal && (
                <ImportPartModal onClose={() => setShowImportPartModal(false)} />
            )}

            {showBlockerPartsModal && (
                <BlockerPartsModal
                    isEditing={isEditingBlocker}
                    part={selectedPart}
                    onClose={() => setShowBlockerPartsModal(false)}
                />
            )}
        </div>
    );
};

export default PartsPage;