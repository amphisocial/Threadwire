
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Tabs from '../comps/Tabs';
import DateNavigation from '../comps/DateNavigation';
import CardsGrid from '../comps/CardsGrid';
import './landingPage.css';

const LandingPage = () => {
  const [weekStart, setWeekStart] = useState(new Date());
  const [filters, setFilters] = useState({
    shippingStatus: 'None',
    partNumber: 'Search by Part Number',
    customer: 'Search by Customer',
  });

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  useEffect(() => {
    document.title = 'Home';
  }, []);

  const handlePrevWeek = () => {
    setWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const handleNextWeek = () => {
    setWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  return (
    <div className="app-container">
      <Tabs filters={filters} onFilterChange={handleFilterChange} />
      <DateNavigation
        weekStart={weekStart}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
      />
      <CardsGrid weekStart={weekStart} filters={filters} />
    </div>
  );
};

export default LandingPage;
