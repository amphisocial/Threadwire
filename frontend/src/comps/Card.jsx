import React from 'react';

const Card = ({ data, onBlockClick, onDangerClick }) => {
  const {
    ordernumber,
    partnumber,
    blockerTag,
    customer_name,
    shipping_status,
    order_status,
    quantity,
    amount,
    order_date,
    linenumber,
  } = data;

  return (
    <div
      className="card-container"
      style={{
        backgroundColor: blockerTag === 'Yes' ? '#ffcccc' : '#ffffe0',
        position: 'relative',
      }}
    >
      {blockerTag === 'Yes' && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            fontSize: '20px',
            color: 'red',
          }}
        >
          &#9762;
        </div>
      )}
      <div className="card-header">Order: {ordernumber}</div>
      <div className="card-body">
        <div className="card-row">Part Number: {partnumber}</div>
        <div className="card-row">Line Number: {linenumber}</div>
        <div className="card-row">Customer Name: {customer_name}</div>
        <div className="card-row">Quantity: {quantity}</div>
        <div className="card-row">Amount: {amount}</div>
        <div className="card-row">Order Status: {order_status}</div>
        <div className="card-row">Shipping Status: {shipping_status}</div>
        <div className="card-row">Order Date: {order_date}</div>
        {blockerTag === 'No' ? (
          <button
            className="blocked-button add-icon"
            onClick={() => onDangerClick(ordernumber, linenumber)}
          >
            ➕
          </button>
        ) : (
          <button
            className="blocked-button edit-icon"
            onClick={() => onBlockClick(ordernumber, partnumber, linenumber)}
          >
            ✍
          </button>
        )}
      </div>
    </div>
  );
};

export default Card;