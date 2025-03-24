import React, { useState } from 'react';
import Papa from 'papaparse';
import './ImportModal.css';

const ImportModal = ({ onClose, onImportComplete }) => {
  const [importStatus, setImportStatus] = useState('');
  const [errors, setErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
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

    setIsProcessing(true);
    setProgress(0);
    setErrors([]);
    setImportStatus('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvContent = e.target.result;

      try {
        Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            try {
              // Validate rows first
              const validRows = [];
              const newErrors = [];
              
              results.data.forEach((row, index) => {
                if (!row.salesOrder || !row.customer_name || !row.line) {
                  newErrors.push({
                    row: index + 2, // +2 for header row and 0-indexing
                    message: "Missing required fields (salesOrder, customer_name, or line)."
                  });
                } else {
                  validRows.push(row);
                }
              });
              
              if (validRows.length > 0) {
                console.log("Sending data to server:", validRows);
                // Send all valid rows in a single request
                const response = await fetch("/api/salesorders/import", {
                  method: "POST",
                  headers: getAuthHeaders(),
                  body: JSON.stringify(validRows) // Send array of rows
                });

                console.log("Response status:", response.status);
                
                if (!response.ok) {
                  const errorData = await response.json();
                  console.error("Server error:", errorData);
                  throw new Error(errorData.error || 'Failed to import sales orders');
                }
                
                const result = await response.json();
                console.error("Server error:", errorData);
                
                // Add any server-reported errors
                if (result.errors && result.errors.length > 0) {
                  setErrors([...newErrors, ...result.errors]);
                } else {
                  setErrors(newErrors);
                }
                
                setImportStatus(newErrors.length === 0 ? 'success' : 'error');
              } else {
                setErrors(newErrors);
                setImportStatus('error');
              }
              
            } catch (error) {
              console.error("Error importing data:", error);
              setErrors([...newErrors, { row: 0, message: `Import failed: ${error.message}` }]);
              setImportStatus('error');
            }
            
            setIsProcessing(false);
            if (importStatus === 'success' && onImportComplete) {
              onImportComplete();
            }
          },
          error: (error) => {
            setErrors([{ row: 0, message: `Error parsing CSV: ${error.message}` }]);
            setIsProcessing(false);
            setImportStatus('error');
          }
        });
      } catch (error) {
        console.error("Error processing CSV:", error);
        setErrors([{ row: 0, message: `Error processing CSV: ${error.message}` }]);
        setIsProcessing(false);
        setImportStatus('error');
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="import-modal-overlay">
      <div className="import-modal">
        <div className="import-modal-header">
          <h3>Import Sales Orders</h3>
          <button className="import-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="import-modal-body">
          <div className="import-section">
            <label className="file-input-label">
              Choose CSV File
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="file-input"
              />
            </label>
          </div>

          {isProcessing && (
            <div className="progress-section">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="progress-text">Processing... {Math.round(progress)}%</p>
            </div>
          )}

          {importStatus && (
            <div className={`status-message ${importStatus}`}>
              {importStatus === 'success' 
                ? 'Import completed successfully!' 
                : 'Import completed with errors'}
            </div>
          )}

          {errors.length > 0 && (
            <div className="error-section">
              <h4>Errors:</h4>
              <ul className="error-list">
                {errors.map((error, index) => (
                  <li key={index} className="error-item">
                    Row {error.row}: {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="import-modal-footer">
            <button
              onClick={onClose}
              className="modal-button"
              disabled={isProcessing}
            >
              {errors.length === 0 ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal; 
