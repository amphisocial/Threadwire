import React, { useState, useEffect } from 'react';
import Card from './Card';
import BlockModal from './BlockModal';

const CardsGrid = ({ weekStart, filters }) => {
  const [cardsData, setCardsData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const handleDangerClick = async (ordernumber, linenumber) => {
    try {
      const response = await fetch('/api/salesorders', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ordernumber, linenumber }),
      });

      if (!response.ok) {
        throw new Error('Failed to update sales order');
      }

      alert('Item blocked successfully.');
      fetchCardsData();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleBlockClick = async (ordernumber, partnumber, linenumber) => {
    setSelectedCard({ ordernumber, partnumber, linenumber });
    setShowModal(true);
    try {
      const response = await fetch(
        `/api/blockers?salesorder=${ordernumber}&linenumber=${linenumber}&partnumber=${partnumber}`,
        {
          headers: getAuthHeaders()
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch initial data.');
      }
      await response.json();
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCard(null);
    fetchCardsData();
  };

  const fetchCardsData = async () => {
    try {
      const response = await fetch('/api/salesorders', {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch sales orders');
      }
      const data = await response.json();
      setCardsData(data);
    } catch (error) {
      console.error('Error fetching cards data:', error);
    }
  };

  useEffect(() => {
    fetchCardsData();
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date.toISOString().split('T')[0];
  });

  const filteredCardsData = cardsData.filter((card) => {
    const matchesShippingStatus =
      filters.shippingStatus === 'None' ||
      card.shipping_status === filters.shippingStatus;
    
    const matchesPartNumber =
      filters.partNumber === 'Search by Part Number' ||
      card.partnumber?.toLowerCase().includes(filters.partNumber.toLowerCase());
    
    const matchesCustomer =
      filters.customer === 'Search by Customer' ||
      card.customer_name?.toLowerCase().includes(filters.customer.toLowerCase());

    return matchesShippingStatus && matchesPartNumber && matchesCustomer;
  });

  return (
    <div className="cards-grid-container">
      {weekDays.map((day) => {
        const cardsForDay = filteredCardsData.filter((card) => {
          const shippingDate = new Date(card.shipping_date).toISOString().split('T')[0];
          return shippingDate === day;
        });

        return (
          <div key={day}>
            {cardsForDay.map((card) => (
              <Card
                key={`${card.ordernumber}-${card.linenumber}`}
                data={card}
                onBlockClick={handleBlockClick}
                onDangerClick={handleDangerClick}
              />
            ))}
          </div>
        );
      })}
      
      {showModal && (
        <BlockModal
          show={showModal}
          onClose={handleCloseModal}
          salesOrder={selectedCard?.ordernumber}
          partNumber={selectedCard?.partnumber}
          lineNumber={selectedCard?.linenumber}
          getAuthHeaders={getAuthHeaders}
        />
      )}
    </div>
  );
};

export default CardsGrid;