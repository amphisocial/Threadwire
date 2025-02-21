import React, { useState } from 'react';
import Papa from 'papaparse';

const ImportWorkOrders = ({ onImportComplete }) => {
    const [showImport, setShowImport] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');

    const getAuthHeaders = () => {
        const token = localStorage.getItem('authToken');
        const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
        return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(isGoogleAuth && { 'Auth-Type': 'google' }),
        };
      };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const csvContent = e.target.result;
            try {
                Papa.parse(csvContent, {
                    header: true,
                    skipEmptyLines: true,
                    complete: async (results) => {
                        const { data } = results;
                        const errors = [];

                        // Validate required fields
                        const requiredFields = ["workorder", "type", "description", "partnumber", "estCost", "quantity", "salesorder"];

                        setProgress(0);
                        for (let i = 0; i < data.length; i++) {
                            const row = data[i];
                            try {
                                const response = await fetch("/api/workorders/import", {
                                    method: "POST",
                                    headers: getAuthHeaders(),
                                    body: JSON.stringify(row),
                                });

                                if (!response.ok) {
                                    const errorText = await response.text();
                                    throw new Error(errorText);
                                }
                            } catch (error) {
                                errors.push({
                                    row: i + 2,
                                    message: `Failed to import row: ${error.message}`,
                                });
                            }
                            setProgress(((i + 1) / data.length) * 100);
                        }

                        if (errors.length === 0) {
                            setStatus('Import successful! All rows processed.');
                        } else {
                            setStatus(`Import completed with ${errors.length} errors`);
                        }

                        if (onImportComplete) {
                            onImportComplete();
                        }
                    },
                    error: (error) => {
                        setStatus(`Error processing CSV: ${error.message}`);
                    }
                });
            } catch (error) {
                setStatus(`Error processing CSV: ${error.message}`);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div>
            <button className="import-button" onClick={() => setShowImport(true)}>
                Import Workorders
            </button>

            {showImport && (
                <div className="import-container">
                    <span className="close-button" onClick={() => setShowImport(false)}>&times;</span>
                    <h3>Import Workorders Data</h3>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                    />
                    <div className="mt-4">
                        <progress value={progress} max="100" className="w-full" />
                    </div>
                    {status && <div className="mt-4">{status}</div>}
                </div>
            )}
        </div>
    );
};


export default ImportWorkOrders;