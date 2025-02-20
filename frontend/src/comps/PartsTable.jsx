import React, { useState, useEffect } from 'react';

const PartsTable = ({ selectedPart, onSelectPart }) => {
  const [parts, setParts] = useState([]);
  const [filters, setFilters] = useState({
    partNumber: '',
    description: '',
    type: ''
  });

  useEffect(() => {
    loadParts();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const isGoogleAuth = localStorage.getItem('isGoogleAuth') === 'true';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(isGoogleAuth && { 'Auth-Type': 'google' }),
    };
  };

  const loadParts = async () => {
    try {
      const response = await fetch('/api/parts', {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      setParts(data);
    } catch (error) {
      console.error('Error loading parts:', error);
    }
  };

  const handleRowClick = (part) => {
    onSelectPart(part);
  };

  const filteredParts = parts.filter(part => 
    part.partnumber.toLowerCase().includes(filters.partNumber.toLowerCase()) &&
    part.description.toLowerCase().includes(filters.description.toLowerCase()) &&
    part.type.toLowerCase().includes(filters.type.toLowerCase())
  );

  return (
    <div>
      <h2>Parts</h2>
      <table id="partsTable">
        <thead>
          <tr>
            <th>
              Part Number
              <input
                type="text"
                placeholder="Search Part #"
                value={filters.partNumber}
                onChange={e => setFilters(prev => ({ ...prev, partNumber: e.target.value }))}
              />
            </th>
            <th>Revision</th>
            <th>
              Description
              <input
                type="text"
                placeholder="Search Description"
                value={filters.description}
                onChange={e => setFilters(prev => ({ ...prev, description: e.target.value }))}
              />
            </th>
            <th>
              Type
              <input
                type="text"
                placeholder="Search Type"
                value={filters.type}
                onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
              />
            </th>
            <th>Category</th>
            <th>Unit Price</th>
            <th>Is BOM</th>
            <th>Date Created</th>
            <th>Date Modified</th>
          </tr>
        </thead>
        <tbody>
          {filteredParts.map(part => (
            <tr
              key={part._id}
              onClick={() => handleRowClick(part)}
              className={`${selectedPart?._id === part._id ? 'highlighted' : ''} ${part.blockerTag > 0 ? 'has-blocker' : ''}`}
            >
              <td>{part.partnumber}</td>
              <td>{part.revision}</td>
              <td>{part.description}</td>
              <td>{part.type}</td>
              <td>{part.category}</td>
              <td>{part.unit_price}</td>
              <td>{part.isbom ? 'Yes' : 'No'}</td>
              <td>{new Date(part.datecreated).toLocaleDateString()}</td>
              <td>{new Date(part.datemodified).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PartsTable;