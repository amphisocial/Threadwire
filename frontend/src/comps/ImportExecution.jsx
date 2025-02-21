import React, { useState } from 'react';
import Papa from 'papaparse';

const ImportExecution = () => {
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
              
              setProgress(0);
              for (let i = 0; i < data.length; i++) {
                const row = data[i];
                try {
                  const response = await fetch("/api/workorderexecution/import", {
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
        <button className="wo-import-button" onClick={() => setShowImport(true)}>
          Import Execution
        </button>
  
        {showImport && (
          <div className="wo-import-modal">
            <div className="wo-import-modal-content">
              <button className="wo-close-button" onClick={() => setShowImport(false)}>&times;</button>
              <h3 className="wo-modal-title">Import Work Order Execution</h3>
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
              {status && <div className="wo-import-status">{status}</div>}
            </div>
          </div>
        )}
      </div>
    );
  };
  
export default ImportExecution;