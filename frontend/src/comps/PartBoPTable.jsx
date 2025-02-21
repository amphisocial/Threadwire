import React, { useState } from 'react';

const PartBoPTable = ({ partBopData }) => {
    const sortedData = [...partBopData].sort((a, b) => a.sequence - b.sequence);

    return (
        <table id="partBopTable">
            <thead>
                <tr>
                    <th>Part Number</th>
                    <th>Operation</th>
                    <th>Sequence</th>
                    <th>OpCode</th>
                    <th>Planner</th>
                </tr>
            </thead>
            <tbody>
                {sortedData.map((bop) => (
                    <tr key={`${bop.partnumber}-${bop.sequence}`}>
                        <td>{bop.partnumber}</td>
                        <td>{bop.operation}</td>
                        <td>{bop.sequence}</td>
                        <td>{bop.opcode}</td>
                        <td>{bop.planner}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default PartBoPTable;