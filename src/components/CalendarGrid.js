import React, { useState } from "react";
import Card from "./Card"; // Use your existing Card component
import "./calendarGrid.css"; // Updated CSS for horizontal layout

// Sample Data
const deliveriesByDate = {
  "2024-06-15": [
    { id: 1, status: "Awaiting Shipping", partNumber: "MRTV00856-01", description: "ECT0687 Open VPX INTEL XEON", manufacturer: "Northrop Grumman", quantity: 15, anticipatedShipDate: "2024-06-15" },
    { id: 2, status: "Awaiting Shipping", partNumber: "TRE98277-5", description: "Switch Channel Custom", manufacturer: "DARPA", quantity: 7, anticipatedShipDate: "2024-06-18" },
  ],
  "2024-06-16": [
    { id: 3, status: "Awaiting Shipping", partNumber: "OPTC026656-03", description: "5665 Optical Data Transfer Unit", manufacturer: "Lockheed Martin", quantity: 105, anticipatedShipDate: "2024-06-16" },
    { id: 4, status: "Awaiting Shipping", partNumber: "332-550856-01", description: "VPX High Compute Module", manufacturer: "Boeing", quantity: 8, anticipatedShipDate: "2024-06-18" },
  ],
  // Add more dates and deliveries...
};

const ITEMS_PER_PAGE = 2; // Cards per page

const CalendarGrid = () => {
  const [currentCalendarPage, setCurrentCalendarPage] = useState(0); // Global calendar pagination
  const [pageByDate, setPageByDate] = useState({}); // Individual date column pagination

  const dates = Object.keys(deliveriesByDate);
  const datesPerPage = 4; // Number of date columns visible at a time
  const paginatedDates = dates.slice(
    currentCalendarPage * datesPerPage,
    (currentCalendarPage + 1) * datesPerPage
  );

  const handlePageChange = (date, direction) => {
    setPageByDate((prev) => ({
      ...prev,
      [date]: Math.max((prev[date] || 0) + direction, 0),
    }));
  };

  return (
    <div className="calendar-container">
      {/* Top-level calendar pagination */}
      <div className="calendar-pagination">
        <button
          onClick={() => setCurrentCalendarPage((prev) => Math.max(prev - 1, 0))}
          disabled={currentCalendarPage === 0}
        >
          &lt;
        </button>
        <span>
          Page {currentCalendarPage + 1} of{" "}
          {Math.ceil(dates.length / datesPerPage)}
        </span>
        <button
          onClick={() =>
            setCurrentCalendarPage((prev) =>
              prev < Math.ceil(dates.length / datesPerPage) - 1 ? prev + 1 : prev
            )
          }
          disabled={
            currentCalendarPage >= Math.ceil(dates.length / datesPerPage) - 1
          }
        >
          &gt;
        </button>
      </div>

      {/* Horizontal scrollable calendar */}
      <div className="calendar-grid">
        {paginatedDates.map((date) => {
          const deliveries = deliveriesByDate[date];
          const currentPage = pageByDate[date] || 0;
          const paginatedDeliveries = deliveries.slice(
            currentPage * ITEMS_PER_PAGE,
            (currentPage + 1) * ITEMS_PER_PAGE
          );

          return (
            <div key={date} className="date-column">
              <div className="date-header">
                <h3>{new Date(date).toLocaleDateString("en-US", { weekday: "short" })}</h3>
                <h4>{date}</h4>
                <div className="pagination">
                  <button
                    onClick={() => handlePageChange(date, -1)}
                    disabled={currentPage === 0}
                  >
                    &lt;
                  </button>
                  <span>
                    {currentPage + 1} of{" "}
                    {Math.ceil(deliveries.length / ITEMS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => handlePageChange(date, 1)}
                    disabled={
                      currentPage >=
                      Math.ceil(deliveries.length / ITEMS_PER_PAGE) - 1
                    }
                  >
                    &gt;
                  </button>
                </div>
              </div>
              <div className="cards-container">
                {paginatedDeliveries.map((delivery) => (
                  <Card key={delivery.id} data={delivery} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;