import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
// import BillingNotifications from './BillingNotifications';
// import NotificationCenter from './NotificationCenter';

export default function Layout({ children }) {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div 
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-3">
            {/* Page Title Area - Can be customized per page */}
            <div className="flex-1" />
            
            {/* Right Side - Notifications & User */}
            <div className="flex items-center space-x-4">
              {/* <BillingNotifications /> */}
              {/* <NotificationCenter /> */}
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
  );
}
