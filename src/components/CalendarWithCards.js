// import React, { useState } from 'react';
// import Calendar from 'react-calendar';
// import 'react-calendar/dist/Calendar.css';
// import Card from './Card'; // Reuse your existing Card component

// const deliveriesByDate = {
//   "2024-12-10": [
//     {
//       id: 1,
//       status: "Awaiting Shipping",
//       partNumber: "MRTV00856-01",
//       description: "ECT0687 Open VPX INTEL XEON",
//       manufacturer: "Northrop Grumman",
//       program: "Eagle Claw",
//       quantity: 15,
//       salesOrder: "122265952",
//       lineNumber: 15.5,
//       contractDate: "2024-06-15",
//       anticipatedShipDate: "2024-06-15",
//       orderAmount: 95650,
//     },
//     // Add more deliveries here
//   ],
// };

// const ITEMS_PER_PAGE = 1; // Cards per page

// const CalendarWithCards = () => {
//   const [selectedDate, setSelectedDate] = useState(null);
//   const [page, setPage] = useState(0);

//   const handleDateChange = (date) => {
//     const formattedDate = date.toISOString().split('T')[0];
//     setSelectedDate(formattedDate);
//     setPage(0); // Reset pagination on date change
//   };

//   const cardsForSelectedDate = deliveriesByDate[selectedDate] || [];
//   const paginatedCards = cardsForSelectedDate.slice(
//     page * ITEMS_PER_PAGE,
//     (page + 1) * ITEMS_PER_PAGE
//   );

//   return (
//     <div>
//       <Calendar onChange={handleDateChange} />
//       {selectedDate && (
//         <div>
//           <h2>Deliveries for {selectedDate}</h2>
//           {paginatedCards.map((delivery) => (
//             <Card key={delivery.id} data={delivery} />
//           ))}
//           <div className="pagination">
//             <button
//               onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
//               disabled={page === 0}
//             >
//               Previous
//             </button>
//             <button
//               onClick={() =>
//                 setPage((prev) =>
//                   prev < Math.ceil(cardsForSelectedDate.length / ITEMS_PER_PAGE) - 1
//                     ? prev + 1
//                     : prev
//                 )
//               }
//               disabled={
//                 page >= Math.ceil(cardsForSelectedDate.length / ITEMS_PER_PAGE) - 1
//               }
//             >
//               Next
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default CalendarWithCards;

// import React from "react";
// import Card from "./Card"; // Existing Card component
// import "./CalendarWithCards.css";

// Sample Data: Deliveries grouped by date
// const deliveriesByDate = {
//   "2024-06-15": [
//     {
//       id: 1,
//       status: "Awaiting Shipping",
//       partNumber: "MRTV00856-01",
//       description: "ECT0687 Open VPX INTEL XEON",
//       manufacturer: "Northrop Grumman",
//       quantity: 15,
//       anticipatedShipDate: "2024-06-15",
//       orderAmount: 95650,
//     },
//     {
//       id: 2,
//       status: "Awaiting Shipping",
//       partNumber: "TRE98277-5",
//       description: "Switch Channel Custom",
//       manufacturer: "DARPA",
//       quantity: 7,
//       anticipatedShipDate: "2024-06-18",
//       orderAmount: 75000,
//     },
//   ],
//   "2024-06-16": [
//     {
//       id: 3,
//       status: "Awaiting Shipping",
//       partNumber: "OPTC026656-03",
//       description: "5665 Optical Data Transfer Unit",
//       manufacturer: "Lockheed Martin",
//       quantity: 105,
//       anticipatedShipDate: "2024-06-16",
//       orderAmount: 200122,
//     },
//   ],
// };

// // Helper function to generate all dates in a range
// const generateDateRange = (startDate, endDate) => {
//   const dates = [];
//   let currentDate = new Date(startDate);
//   while (currentDate <= new Date(endDate)) {
//     dates.push(new Date(currentDate).toISOString().split("T")[0]);
//     currentDate.setDate(currentDate.getDate() + 1);
//   }
//   return dates;
// };

// const CalendarWithCards = () => {
//   const allDates = generateDateRange("2024-06-01", "2024-06-30"); // Full month range

//   return (
//     <div className="calendar-container">
//       <div className="calendar-grid">
//         {allDates.map((date) => (
//           <div key={date} className="date-column">
//             {/* Date Header */}
//             <div className="date-header">
//               <h3>{new Date(date).toLocaleDateString("en-US", { weekday: "short" })}</h3>
//               <h4>{date}</h4>
//             </div>
//             {/* Cards or Placeholder */}
//             <div className="cards-container">
//               {deliveriesByDate[date] ? (
//                 deliveriesByDate[date].map((delivery) => (
//                   <Card key={delivery.id} data={delivery} />
//                 ))
//               ) : (
//                 <p className="no-deliveries">No deliveries</p>
//               )}
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default CalendarWithCards;

import React, { useState } from "react";
import "./CalendarWithCards.css";
import Card from "./Card"; // Card component

// Sample Data: Deliveries grouped by date
const deliveriesByDate = {
  "2024-06-15": [
    {
      id: 1,
      status: "Awaiting Shipping",
      partNumber: "MRTV00856-01",
      description: "ECT0687 Open VPX INTEL XEON",
      manufacturer: "Northrop Grumman",
      quantity: 15,
      anticipatedShipDate: "2024-06-15",
      orderAmount: 95650,
    },
    {
      id: 2,
      status: "Awaiting Shipping",
      partNumber: "TRE98277-5",
      description: "Switch Channel Custom",
      manufacturer: "DARPA",
      quantity: 7,
      anticipatedShipDate: "2024-06-18",
      orderAmount: 75000,
    },
  ],
  "2024-06-16": [
    {
      id: 3,
      status: "Awaiting Shipping",
      partNumber: "OPTC026656-03",
      description: "5665 Optical Data Transfer Unit",
      manufacturer: "Lockheed Martin",
      quantity: 105,
      anticipatedShipDate: "2024-06-16",
      orderAmount: 200122,
    },
  ],
  "2024-06-17": [
    {
      id: 4,
      status: "Awaiting Shipping",
      partNumber: "CAPS653-122-15",
      description: "Down Converter 455-001",
      manufacturer: "Northrop Grumman",
      quantity: 5,
      anticipatedShipDate: "2024-06-17",
      orderAmount: 5000,
    },
  ],
  "2024-06-18": [
    {
      id: 5,
      status: "Awaiting Shipping",
      partNumber: "933-258-0112",
      description: "ECT0687 Open VPX INTEL XEON",
      manufacturer: "Northrop Grumman",
      quantity: 9,
      anticipatedShipDate: "2024-06-18",
      orderAmount: 52535,
    },
  ],
};

// Helper function to generate the next set of visible dates
const generateVisibleDates = (startDate, numDays) => {
  const dates = [];
  let currentDate = new Date(startDate);
  for (let i = 0; i < numDays; i++) {
    dates.push(new Date(currentDate).toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

const CalendarWithCards = () => {
  const [currentStartDate, setCurrentStartDate] = useState("2024-06-15"); // Starting date
  const daysToShow = 7; // Number of days to display in the view

  // Generate the set of visible dates
  const visibleDates = generateVisibleDates(currentStartDate, daysToShow);

  // Handle navigation
  const handleNavigation = (direction) => {
    const newStartDate = new Date(currentStartDate);
    newStartDate.setDate(newStartDate.getDate() + direction * daysToShow);
    setCurrentStartDate(newStartDate.toISOString().split("T")[0]);
  };

  return (
    <div className="calendar-container">
      {/* Navigation Buttons */}
      <div className="navigation-buttons">
        <button onClick={() => handleNavigation(-1)}>Previous</button>
        <span>
          {visibleDates[0]} - {visibleDates[visibleDates.length - 1]}
        </span>
        <button onClick={() => handleNavigation(1)}>Next</button>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {visibleDates.map((date) => (
          <div key={date} className="date-column">
            {/* Date Header */}
            <div className="date-header">
              <h3>{new Date(date).toLocaleDateString("en-US", { weekday: "short" })}</h3>
              <h4>{date}</h4>
            </div>
            {/* Cards or Placeholder */}
            <div className="cards-container">
              {deliveriesByDate[date] ? (
                deliveriesByDate[date].map((delivery) => (
                  <Card key={delivery.id} data={delivery} />
                ))
              ) : (
                <p className="no-deliveries">No deliveries</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarWithCards;