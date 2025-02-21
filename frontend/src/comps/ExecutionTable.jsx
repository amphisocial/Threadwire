import React, { useState } from 'react';

const ExecutionTable = ({ executionData }) => {
    const sortedExecutions = [...executionData].sort((a, b) => {
        if (a.serialNumber < b.serialNumber) return -1;
        if (a.serialNumber > b.serialNumber) return 1;
        return new Date(a.timeIn) - new Date(b.timeIn);
    });

    return (
        <table id="executionStatusTable">
            <thead>
                <tr>
                    <th>SerialNumber</th>
                    <th>Operation</th>
                    <th>Operator</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Status</th>
                    <th>Location</th>
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
            </tbody>
        </table>
    );
};

export default ExecutionTable;