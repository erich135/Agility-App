import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

const Calendar = ({ events = [], onDateSelect, onEventClick, selectedDate = new Date() }) => {
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
      if (!event || !event.start_time) return false;
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

  // Get week days for week view
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push(date);
    }
    return weekDays;
  };

  // Get hours for day/week view
  const getHours = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i);
    }
    return hours;
  };

  // Navigation functions for week/day
  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const navigateDay = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  // Get events for a specific hour on a date
  const getEventsForHour = (date, hour) => {
    return events.filter(event => {
      if (!event || !event.start_time) return false;
      const eventDate = new Date(event.start_time);
      const eventHour = eventDate.getHours();
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear() &&
        eventHour === hour
      );
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
              {viewMode === 'month' && `${months[month]} ${year}`}
              {viewMode === 'week' && `Week of ${getWeekDays()[0].toLocaleDateString()}`}
              {viewMode === 'day' && currentDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (viewMode === 'month') navigateMonth(-1);
                  else if (viewMode === 'week') navigateWeek(-1);
                  else if (viewMode === 'day') navigateDay(-1);
                }}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                title={`Previous ${viewMode}`}
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
                onClick={() => {
                  if (viewMode === 'month') navigateMonth(1);
                  else if (viewMode === 'week') navigateWeek(1);
                  else if (viewMode === 'day') navigateDay(1);
                }}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                title={`Next ${viewMode}`}
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
                      {dayEvents.slice(0, 3).map((event, eventIndex) => {
                        if (!event) return null;
                        return (
                        <div
                          key={eventIndex}
                          className={`
                            text-xs px-1 py-0.5 rounded text-white truncate cursor-pointer hover:opacity-80 transition-opacity
                            ${getEventColor(event?.event_type)}
                          `}
                          title={`${formatTime(event?.start_time)} - ${event?.title || 'Untitled Event'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEventClick) {
                              onEventClick(event);
                            }
                          }}
                        >
                          {formatTime(event?.start_time)} {event?.title || 'Untitled Event'}
                        </div>
                        );
                      })}
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

        {/* Week View */}
        {viewMode === 'week' && (
          <div>
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateWeek(-1)}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                  title="Previous week"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigateWeek(1)}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                  title="Next week"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Week of {getWeekDays()[0].toLocaleDateString()}
              </h3>
            </div>

            {/* Week Grid */}
            <div className="grid grid-cols-8 gap-1">
              {/* Time column header */}
              <div className="p-2 text-center text-sm font-medium text-gray-500 border-r">
                Time
              </div>

              {/* Day headers */}
              {getWeekDays().map((date, index) => {
                const isCurrentMonthDate = isCurrentMonth(date);
                const isTodayDate = isToday(date);
                return (
                  <div
                    key={index}
                    className={`p-2 text-center text-sm border-r ${
                      isTodayDate
                        ? 'bg-blue-50 text-blue-600 font-semibold'
                        : isCurrentMonthDate
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }`}
                  >
                    <div className="font-medium">{daysOfWeek[date.getDay()]}</div>
                    <div className={`text-xs ${isTodayDate ? 'text-blue-600' : 'text-gray-500'}`}>
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}

              {/* Time slots and events */}
              {getHours().slice(6, 22).map((hour) => (
                <React.Fragment key={hour}>
                  {/* Time label */}
                  <div className="p-2 text-xs text-gray-500 text-center border-r border-b">
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </div>
                  
                  {/* Day cells */}
                  {getWeekDays().map((date, dayIndex) => {
                    const hourEvents = getEventsForHour(date, hour);
                    return (
                      <div
                        key={`${hour}-${dayIndex}`}
                        className="relative p-1 min-h-[60px] border-r border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleDateClick(date)}
                      >
                        {hourEvents.map((event, eventIndex) => {
                          if (!event) return null;
                          return (
                          <div
                            key={eventIndex}
                            className={`
                              text-xs p-1 mb-1 rounded text-white truncate cursor-pointer hover:opacity-80
                              ${getEventColor(event?.event_type)}
                            `}
                            title={`${formatTime(event?.start_time)} - ${event?.title || 'Untitled Event'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onEventClick) {
                                onEventClick(event);
                              }
                            }}
                          >
                            {event?.title || 'Untitled Event'}
                          </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Day View */}
        {viewMode === 'day' && (
          <div>
            {/* Day Navigation */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateDay(-1)}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                  title="Previous day"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigateDay(1)}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                  title="Next day"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                {currentDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
            </div>

            {/* Day Schedule */}
            <div className="grid grid-cols-1 gap-1 max-h-[600px] overflow-y-auto">
              {getHours().map((hour) => {
                const hourEvents = getEventsForHour(currentDate, hour);
                return (
                  <div
                    key={hour}
                    className="flex border-b border-gray-200 min-h-[80px] hover:bg-gray-50"
                  >
                    {/* Time column */}
                    <div className="w-20 p-3 text-sm text-gray-500 text-center border-r">
                      {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                    </div>
                    
                    {/* Events column */}
                    <div 
                      className="flex-1 p-2 cursor-pointer"
                      onClick={() => handleDateClick(currentDate)}
                    >
                      {hourEvents.map((event, eventIndex) => {
                        if (!event) return null;
                        return (
                        <div
                          key={eventIndex}
                          className={`
                            mb-2 p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow
                            ${getEventColor(event?.event_type)} text-white
                          `}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEventClick) {
                              onEventClick(event);
                            }
                          }}
                        >
                          <div className="font-medium">{event?.title || 'Untitled Event'}</div>
                          <div className="text-xs opacity-90 mt-1">
                            {formatTime(event?.start_time)} - {formatTime(event?.end_time)}
                          </div>
                          {event?.location && (
                            <div className="text-xs opacity-80 mt-1">📍 {event.location}</div>
                          )}
                          {event?.description && (
                            <div className="text-xs opacity-90 mt-2">{event.description}</div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
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