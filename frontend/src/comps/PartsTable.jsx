import React, { useState, useEffect } from 'react';
import './parts-table.css';

const PartsTable = ({ selectedPart, onSelectPart }) => {
    const [parts, setParts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
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
            setIsLoading(true);
            setError(null);
            const response = await fetch('/api/parts', {
                method: 'GET',
                headers: getAuthHeaders(),
            });
            
            if (!response.ok) {
                throw new Error('Failed to load parts');
            }
            
            const data = await response.json();
            setParts(data || []);
        } catch (error) {
            console.error('Error loading parts:', error);
            setError('Failed to load parts. Please try again later.');
            setParts([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRowClick = (part) => {
        onSelectPart(part);
    };

    const safeIncludes = (str, searchStr) => {
        if (str === null || str === undefined) return false;
        return String(str).toLowerCase().includes((searchStr || '').toLowerCase());
    };

    const filteredParts = parts.filter(part => {
        if (!part) return false;

        const matchesPartNumber = safeIncludes(part.partnumber, filters.partNumber);
        const matchesDescription = safeIncludes(part.description, filters.description);
        const matchesType = safeIncludes(part.type, filters.type);

        return matchesPartNumber && matchesDescription && matchesType;
    });

    if (isLoading) {
        return (
            <div className="pm-table-container">
                <div className="pm-table-loading">
                    Loading parts...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="pm-table-container">
                <div className="pm-table-error">
                    {error}
                </div>
            </div>
        );
    }

    if (!filteredParts.length) {
        return (
            <div className="pm-table-container">
                <div className="pm-table-empty">
                    No parts found. {filters.partNumber || filters.description || filters.type ? 'Try adjusting your filters.' : ''}
                </div>
            </div>
        );
    }

    return (
        <div className="pm-table-container">
            <table className="pm-parts-table">
                <thead>
                    <tr>
                        <th>
                            Part Number
                            <input
                                type="text"
                                className="pm-filter-input"
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
                                className="pm-filter-input"
                                placeholder="Search Description"
                                value={filters.description}
                                onChange={e => setFilters(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </th>
                        <th>
                            Type
                            <input
                                type="text"
                                className="pm-filter-input"
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
                            key={part._id || Math.random()}
                            onClick={() => handleRowClick(part)}
                            className={`
                                pm-table-row
                                ${selectedPart?._id === part._id ? 'pm-selected' : ''}
                                ${part.blockerTag > 0 ? 'pm-has-blocker' : ''}
                            `}
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