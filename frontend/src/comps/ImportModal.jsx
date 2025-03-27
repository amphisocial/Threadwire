import React, { useState } from 'react';
import Papa from 'papaparse';

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
            const { data } = results;
            const errors = [];

            setProgress(0);
            for (let i = 0; i < data.length; i++) {
              const row = data[i];
              try {
                // Validate required fields
                if (!row.salesOrder || !row.customer_name || !row.line) {
                  errors.push({
                    row: i + 2,
                    message: "Missing required fields (salesOrder, customer_name, or line)."
                  });
                  continue;
                }

                const response = await fetch("/api/salesorders/import", {
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
              setImportStatus('success');
              setErrors([]);
            } else {
              setImportStatus('error');
              setErrors(errors);
            }

            setIsProcessing(false);

            if (errors.length === 0 && onImportComplete) {
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
        setErrors([{ row: 0, message: `Error processing CSV: ${error.message}` }]);
        setIsProcessing(false);
        setImportStatus('error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="wo-import-modal">
      <div className="wo-import-modal-content">
        <button className="wo-close-button" onClick={onClose}>&times;</button>
        <h3 className="wo-modal-title">Import Sales Orders</h3>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="wo-file-input"
        />
        {progress > 0 && (
          <div className="wo-progress-container">
            <progress className="wo-progress" value={progress} max="100" />
            <div className="wo-progress-text">{Math.round(progress)}%</div>
          </div>
        )}
        {importStatus && (
          <div className="wo-import-status">
            {importStatus === 'success' 
              ? 'Import successful! All rows processed.'
              : `Import completed with ${errors.length} errors`}
          </div>
        )}
        {errors.length > 0 && (
          <div className="wo-error-section">
            <h4>Errors:</h4>
            <ul>
              {errors.map((error, index) => (
                <li key={index}>
                  Row {error.row}: {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportModal;