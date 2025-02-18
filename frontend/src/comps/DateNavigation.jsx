import React from 'react';

const DateNavigation = ({ weekStart, onPrevWeek, onNextWeek }) => {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date.toDateString().split(' ').slice(0, 3).join(' ');
  });

  return (
    <div className="date-navigation-container">
      <button className="left-arrow" onClick={onPrevWeek}>
        ◀
      </button>
      {days.map((day, idx) => (
        <div key={idx} className="date-box">
          {day}
        </div>
      ))}
      <button className="right-arrow" onClick={onNextWeek}>
        ▶
      </button>
    </div>
  );
};

export default DateNavigation;