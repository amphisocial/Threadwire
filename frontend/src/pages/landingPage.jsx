// import React from 'react';
// import { useAuth } from '../context/authContext';
// import { useNavigate } from 'react-router-dom';

// const LandingPage = () => {
//   const { logout } = useAuth();
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     logout();
//     navigate('/login');
//   };

//   return (
//     <div>
//       <header>
//         <h1>Landing Page</h1>
//         <button onClick={handleLogout}>Logout</button>
//       </header>
//     </div>
//   );
// };

// export default LandingPage;


import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Tabs from '../components/Tabs';
import DateNavigation from '../components/DateNavigation';
import CardsGrid from '../components/CardsGrid';
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