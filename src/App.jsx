import React from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import CIPCManagement from './components/CIPCManagement';
import CustomerManagement from './components/CustomerManagement';
import SystemManagement from './components/SystemManagement';
import CalendarTaskManagement from './components/CalendarTaskManagement';
import DashboardAnalytics from './components/DashboardAnalytics';
import ClientPortal from './components/ClientPortal';
import FinancialStatements from './components/FinancialStatements';
import Timesheet from './components/Timesheet';
import MyTimesheets from './components/MyTimesheets';
import ProjectManagement from './components/ProjectManagement';
import BillingDashboard from './components/BillingDashboard';
import BillingReports from './components/BillingReports';

// TODO: Re-enable authentication later using lead-management-system approach
// import { AuthProvider, useAuth } from './contexts/AuthContext';
// import LoginPage from './components/LoginPage';
// import ChatWidget from './components/ChatWidget';

// Mock user for development - uses fixed UUID that matches database consultant
const mockUser = {
  id: 'a0000000-0000-0000-0000-000000000001',  // Must match consultant in database
  email: 'dev@agility.co.za',
  full_name: 'Development User',
  role: 'admin'
};

// Simple wrapper that provides mock user context
const DevAuthProvider = ({ children }) => {
  const contextValue = {
    user: mockUser,
    isLoggedIn: () => true,
    isAdmin: () => true,
    login: () => {},
    logout: () => {},
    loading: false
  };

  return (
    <DevAuthContext.Provider value={contextValue}>
      {children}
    </DevAuthContext.Provider>
  );
};

// Create a simple context for development
const DevAuthContext = React.createContext(null);

// Export hook for components that need user info
export const useAuth = () => {
  const context = React.useContext(DevAuthContext);
  if (!context) {
    // Return mock values if not in provider
    return {
      user: mockUser,
      isLoggedIn: () => true,
      isAdmin: () => true,
      login: () => {},
      logout: () => {},
      loading: false
    };
  }
  return context;
};

function App() {
  return (
    <DevAuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/cipc" element={<CIPCManagement />} />
          <Route path="/customers" element={<CustomerManagement />} />
          <Route path="/management" element={<SystemManagement />} />
          <Route path="/calendar" element={<CalendarTaskManagement />} />
          <Route path="/timesheet" element={<Timesheet />} />
          <Route path="/my-timesheets" element={<MyTimesheets />} />
          <Route path="/projects" element={<ProjectManagement />} />
          <Route path="/billing" element={<BillingDashboard />} />
          <Route path="/reports" element={<BillingReports />} />
          <Route path="/dashboard" element={<DashboardAnalytics />} />
          <Route path="/client-portal" element={<ClientPortal />} />
          <Route path="/financial-statements" element={<FinancialStatements />} />
        </Routes>
      </Router>
    </DevAuthProvider>
  );
}

export default App;