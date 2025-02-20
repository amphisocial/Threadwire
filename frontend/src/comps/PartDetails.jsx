import React from 'react';

const PartDetails = ({ part }) => {
  if (!part) return null;

  const customAttributes = Object.keys(part)
    .filter(key => key.startsWith('customattribute'))
    .map(key => ({
      label: key.replace('customattribute', 'Custom Attribute '),
      value: part[key] || 'N/A'
    }));

  return (
    <div id="partDetails">
      <p><strong>Part Number:</strong> {part.partnumber}</p>
      <p><strong>Revision:</strong> {part.revision}</p>
      <p><strong>Description:</strong> {part.description}</p>
      <p><strong>Type:</strong> {part.type}</p>
      <p><strong>Category:</strong> {part.category}</p>
      <p><strong>Unit Price:</strong> {part.unit_price}</p>
      <p><strong>Is BOM:</strong> {part.isbom ? 'Yes' : 'No'}</p>
      <p><strong>Date Created:</strong> {new Date(part.datecreated).toLocaleDateString()}</p>
      <p><strong>Date Modified:</strong> {new Date(part.datemodified).toLocaleDateString()}</p>
      <p><strong>Created By:</strong> {part.createdby || 'N/A'}</p>
      <p><strong>Last Modifier:</strong> {part.lastmodifier || 'N/A'}</p>
      {customAttributes.map(({ label, value }, index) => (
        <p key={index}><strong>{label}:</strong> {value}</p>
      ))}
    </div>
  );
};

export default PartDetails;