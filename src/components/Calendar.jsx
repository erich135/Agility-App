import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

const Calendar = ({ events = [], onDateSelect, selectedDate = new Date() }) => {
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate));
  const [viewMode, setViewMode] = useState('month'); // month, week, day

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get calendar data
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

  // Generate calendar days
  const calendarDays = [];
  const currentDay = new Date(startDate);
  
  for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
    calendarDays.push(new Date(currentDay));
    currentDay.setDate(currentDay.getDate() + 1);
  }

  // Navigation functions
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const navigateToToday = () => {
    setCurrentDate(new Date());
  };

  // Get events for a specific date
  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if date is in current month
  const isCurrentMonth = (date) => {
    return date.getMonth() === month;
  };

  // Handle date click
  const handleDateClick = (date) => {
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  // Format time for event display
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get event color based on type
  const getEventColor = (eventType) => {
    const colors = {
      meeting: 'bg-blue-500',
      appointment: 'bg-green-500',
      deadline: 'bg-red-500',
      reminder: 'bg-yellow-500'
    };
    return colors[eventType] || 'bg-gray-500';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Calendar Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {months[month]} {year}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                title="Previous month"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button
                onClick={navigateToToday}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                title="Next month"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="month">Month</option>
              <option value="week">Week</option>
              <option value="day">Day</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {viewMode === 'month' && (
          <div>
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar dates */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                const dayEvents = getEventsForDate(date);
                const isCurrentMonthDate = isCurrentMonth(date);
                const isTodayDate = isToday(date);

                return (
                  <div
                    key={index}
                    onClick={() => handleDateClick(date)}
                    className={`
                      min-h-[80px] p-1 border border-gray-100 cursor-pointer transition-colors
                      ${isCurrentMonthDate ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-400'}
                      ${isTodayDate ? 'bg-blue-50 border-blue-200' : ''}
                    `}
                  >
                    <div className={`
                      text-sm font-medium mb-1
                      ${isTodayDate ? 'text-blue-600' : isCurrentMonthDate ? 'text-gray-900' : 'text-gray-400'}
                    `}>
                      {date.getDate()}
                    </div>
                    
                    {/* Events for this date */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event, eventIndex) => (
                        <div
                          key={eventIndex}
                          className={`
                            text-xs px-1 py-0.5 rounded text-white truncate
                            ${getEventColor(event.event_type)}
                          `}
                          title={`${formatTime(event.start_time)} - ${event.title}`}
                        >
                          {formatTime(event.start_time)} {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 px-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Week View (simplified) */}
        {viewMode === 'week' && (
          <div className="text-center py-8 text-gray-500">
            <p>Week view coming soon...</p>
            <p className="text-sm mt-2">Switch to Month view to see calendar events</p>
          </div>
        )}

        {/* Day View (simplified) */}
        {viewMode === 'day' && (
          <div className="text-center py-8 text-gray-500">
            <p>Day view coming soon...</p>
            <p className="text-sm mt-2">Switch to Month view to see calendar events</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-6 text-sm">
          <span className="font-medium text-gray-700">Event Types:</span>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-600">Meeting</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600">Appointment</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600">Deadline</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-gray-600">Reminder</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;