import React, { useState } from 'react';

const PartBoPTable = ({ partBopData }) => {
    const sortedData = [...partBopData].sort((a, b) => a.sequence - b.sequence);

    return (
        <table className="wo-table">
      <thead>
        <tr>
          <th>PART NUMBER</th>
          <th>OPERATION</th>
          <th>SEQUENCE</th>
          <th>OPCODE</th>
          <th>PLANNER</th>
        </tr>
      </thead>
      <tbody>
        {sortedData.map((bop, index) => (
          <tr key={`${bop.partnumber}-${bop.sequence}-${index}`}>
            <td>{bop.partnumber}</td>
            <td>{bop.operation}</td>
            <td>{bop.sequence}</td>
            <td>{bop.opcode}</td>
            <td>{bop.planner}</td>
          </tr>
        ))}
        {sortedData.length === 0 && (
          <tr>
            <td colSpan="5" className="wo-no-data">No data available</td>
          </tr>
        )}
      </tbody>
    </table>
    );
};

export default PartBoPTable;