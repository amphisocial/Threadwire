// import React from 'react';
// import './Card.css';

// const Card = ({ data }) => {
//   if (!data) {
//     return <p>No data available</p>; // Add fallback in case `data` is undefined
//   }

//   return (
//     <div className="card-container">
//       <div className="card-header">
//         <h3>MAN</h3>
//         <p>{data.status}</p>
//       </div>
//       <div className="card-body">
//         <div className="card-row">
//           <label>Ops Status</label>
//           <select defaultValue={data.operationsStatus}>
//             <option value="Pending">Pending</option>
//             <option value="In Progress">In Progress</option>
//             <option value="Completed">Completed</option>
//           </select>
//         </div>
//         <div className="card-row">
//           <label>New Status</label>
//           <select defaultValue={data.newStatus}>
//             <option value="Pending">Pending</option>
//             <option value="Shipped">Shipped</option>
//             <option value="Cancelled">Cancelled</option>
//           </select>
//         </div>
//         <h4>{data.partNumber}</h4>
//         <p>{data.description}</p>
//         <p><strong>{data.manufacturer}</strong></p>
//         <p>Program: {data.program}</p>
//         <h4>QTY: {data.quantity}</h4>
//         <p>SO: {data.salesOrder}</p>
//         <p>Line: {data.lineNumber}</p>
//         <p>Contract Date: {data.contractDate}</p>
//         <p>Anticipated Ship Date: {data.anticipatedShipDate}</p>
//         <h4>Order Amount: ${data.orderAmount.toLocaleString()}</h4>
//       </div>
//       <div className="card-footer">
//         <button className="action-button">Details</button>
//         <button className="action-button">History</button>
//       </div>
//     </div>
//   );
// };

// export default Card;

import React from "react";
import "./Card.css";

const Card = ({ data }) => {
  return (
    <div className="card-container">
      <h3>{data.partNumber || "No Part Number"}</h3>
      <p>{data.description || "No Description"}</p>
      <p><strong>Quantity:</strong> {data.quantity || 0}</p>
      <p><strong>Amount:</strong> ${data.orderAmount?.toLocaleString() || "0.00"}</p>
    </div>
  );
};

export default Card;
