import React from 'react';

const PartDetailsModal = ({ part, onClose, onAddBlocker, onEditBlocker }) => {
  if (!part) return null;

  const customAttributes = Object.keys(part)
    .filter(key => key.startsWith('customattribute'))
    .map(key => ({
      label: key.replace('customattribute', 'Custom Attribute '),
      value: part[key] || 'N/A'
    }));

  return (
    <div className="pm-modal-overlay">
      <div className="pm-details-modal">
        <div className="pm-modal-header">
          <h2>Part Details</h2>
          <button className="pm-close-button" onClick={onClose}>×</button>
        </div>

        <div className="pm-modal-content">
          <div className="pm-details-buttons">
            <button 
              className="pm-action-button pm-add-button"
              onClick={onAddBlocker}
            >
              + Add Risk/Issue
            </button>
            <button 
              className="pm-action-button pm-edit-button"
              onClick={onEditBlocker}
            >
              Edit Risk/Issue
            </button>
          </div>

          <div className="pm-details-grid">
            <div className="pm-detail-item">
              <strong>Part Number:</strong>
              <span>{part.partnumber}</span>
            </div>
            <div className="pm-detail-item">
              <strong>Revision:</strong>
              <span>{part.revision}</span>
            </div>
            <div className="pm-detail-item">
              <strong>Description:</strong>
              <span>{part.description}</span>
            </div>
            <div className="pm-detail-item">
              <strong>Type:</strong>
              <span>{part.type}</span>
            </div>
            <div className="pm-detail-item">
              <strong>Category:</strong>
              <span>{part.category}</span>
            </div>
            <div className="pm-detail-item">
              <strong>Unit Price:</strong>
              <span>{part.unit_price}</span>
            </div>
            <div className="pm-detail-item">
              <strong>Is BOM:</strong>
              <span>{part.isbom ? 'Yes' : 'No'}</span>
            </div>
            <div className="pm-detail-item">
              <strong>Date Created:</strong>
              <span>{new Date(part.datecreated).toLocaleDateString()}</span>
            </div>
            <div className="pm-detail-item">
              <strong>Date Modified:</strong>
              <span>{new Date(part.datemodified).toLocaleDateString()}</span>
            </div>
            <div className="pm-detail-item">
              <strong>Created By:</strong>
              <span>{part.createdby || 'N/A'}</span>
            </div>
            <div className="pm-detail-item">
              <strong>Last Modifier:</strong>
              <span>{part.lastmodifier || 'N/A'}</span>
            </div>
            {customAttributes.map(({ label, value }, index) => (
              <div key={index} className="pm-detail-item">
                <strong>{label}:</strong>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartDetailsModal;