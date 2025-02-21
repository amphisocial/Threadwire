import React, { useState } from 'react';

const ExecutionTable = ({ executionData }) => {
    const sortedExecutions = [...executionData].sort((a, b) => {
        if (a.serialNumber < b.serialNumber) return -1;
        if (a.serialNumber > b.serialNumber) return 1;
        return new Date(a.timeIn) - new Date(b.timeIn);
    });

    return (
        <table className="wo-table">
      <thead>
        <tr>
          <th>SERIALNUMBER</th>
          <th>OPERATION</th>
          <th>OPERATOR</th>
          <th>TIME IN</th>
          <th>TIME OUT</th>
          <th>STATUS</th>
          <th>LOCATION</th>
        </tr>
      </thead>
      <tbody>
        {sortedExecutions.map((exec, index) => (
          <tr key={`${exec.serialNumber}-${exec.timeIn}-${index}`}>
            <td>{exec.serialNumber}</td>
            <td>{exec.operation}</td>
            <td>{exec.operator}</td>
            <td>{exec.timeIn}</td>
            <td>{exec.timeOut || '-'}</td>
            <td>{exec.status}</td>
            <td>{exec.location}</td>
          </tr>
        ))}
        {sortedExecutions.length === 0 && (
          <tr>
            <td colSpan="7" className="wo-no-data">No execution data available</td>
          </tr>
        )}
      </tbody>
    </table>
    );
};

export default ExecutionTable;