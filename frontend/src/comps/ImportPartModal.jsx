import React, { useState, useRef } from 'react';
import Papa from 'papaparse';

const ImportPartModal = ({ onClose }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [showProgress, setShowProgress] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const getAuthHeaders = () => {
        const token = localStorage.getItem('authToken');
        const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
        return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(isGoogleAuth && { 'Auth-Type': 'google' }),
        };
      };

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvContent = e.target.result;
        const { data: rows, meta: { fields: headers } } = Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true
        });

        const requiredFields = ['partnumber', 'revision', 'description', 'type', 'category', 'unit_price', 'isbom'];
        const missingFields = requiredFields.filter(field => !headers.includes(field));

        if (missingFields.length > 0) {
          setStatus(`Missing required headers: ${missingFields.join(', ')}`);
          return;
        }

        setShowProgress(true);
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
          const part = rows[i];
          try {
            const response = await fetch('/api/parts/import', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                ...part,
                isbom: part.isbom.toLowerCase() === 'yes'
              })
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(errorText);
            }
          } catch (error) {
            errors.push({ row: i + 2, message: `Failed to import row: ${error.message}` });
          }

          setProgress(((i + 1) / rows.length) * 100);
        }

        setShowProgress(false);
        setStatus(errors.length === 0 
          ? 'Import successful! All rows processed.'
          : `Import completed with errors:\n${errors.map(err => `Row ${err.row}: ${err.message}`).join('\n')}`
        );
      } catch (error) {
        console.error('Error processing CSV:', error);
        setStatus(`Error processing CSV: ${error.message}`);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="pm-modal">
      <div className="pm-modal-content">
        <span className="pm-close" onClick={onClose}>&times;</span>
        <h3>Import Parts Data</h3>
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv"
          onChange={handleFileChange}
        />
        {showProgress && (
          <div className="progress-container">
            <progress value={progress} max="100" />
          </div>
        )}
        {status && (
          <div className="status-message">
            {status.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportPartModal;