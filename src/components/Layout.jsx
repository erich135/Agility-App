import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import GlobalTimerCard from './GlobalTimerCard';
import NotificationBell from './NotificationBell';
import GlobalCalendarPopup from './GlobalCalendarPopup';
import { CalendarClock } from 'lucide-react';

export default function Layout({ children }) {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [showCalendar, setShowCalendar] = useState(false);

  // Listen for sidebar state changes
  useEffect(() => {
    const checkSidebar = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarCollapsed(saved ? JSON.parse(saved) : false);
    };
    
    // Check periodically for changes
    const interval = setInterval(checkSidebar, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Sidebar */}
      <Sidebar />

      <GlobalTimerCard />
      
      {/* Main Content */}
      <div 
        className={`transition-all duration-300 ${
          // sidebar is inset by 1rem (left-4) and we keep a 1rem gap to the content
          sidebarCollapsed ? 'ml-[5rem]' : 'ml-[17rem]'
        }`}
      >
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm min-h-[calc(100vh-2rem)]">
          {/* Top Bar */}
          <header className="bg-white border-b border-gray-200 rounded-t-2xl">
            <div className="flex items-center justify-between px-6 py-3">
              {/* Page Title Area - Can be customized per page */}
              <div className="flex-1" />
              
              {/* Right Side - Notifications & User */}
              <div className="flex items-center space-x-4">
                {/* Global Calendar button */}
                <button
                  onClick={() => setShowCalendar(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
                  title="Open Calendar"
                >
                  <CalendarClock className="w-4 h-4" />
                  <span className="hidden sm:inline">Calendar</span>
                </button>
                {/* <BillingNotifications /> */}
                {/* <NotificationCenter /> */}
                <NotificationBell />
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.full_name || user?.first_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">{user?.role || 'User'}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Global Calendar Popup */}
      {showCalendar && <GlobalCalendarPopup onClose={() => setShowCalendar(false)} />}
    </div>
  );
}
