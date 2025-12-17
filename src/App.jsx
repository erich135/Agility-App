import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import SetupPassword from './components/SetupPassword';
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
import UserManagement from './components/UserManagement';

// Protected Route component
const ProtectedRoute = ({ children, requiredPermission }) => {
  const { isLoggedIn, hasPermission, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  // Check permission if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view this page.</p>
          <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">Go to Home</a>
        </div>
      </div>
    );
  }

  return children;
};

// Public Route - redirects to home if already logged in
const PublicRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isLoggedIn()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/setup-password" element={<SetupPassword />} />

      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute requiredPermission="access_dashboard"><DashboardAnalytics /></ProtectedRoute>} />
      <Route path="/cipc" element={<ProtectedRoute requiredPermission="access_cipc"><CIPCManagement /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute requiredPermission="access_customers"><CustomerManagement /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute requiredPermission="access_calendar"><CalendarTaskManagement /></ProtectedRoute>} />
      <Route path="/timesheet" element={<ProtectedRoute requiredPermission="access_timesheet"><Timesheet /></ProtectedRoute>} />
      <Route path="/my-timesheets" element={<ProtectedRoute requiredPermission="access_my_timesheets"><MyTimesheets /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute requiredPermission="access_projects"><ProjectManagement /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute requiredPermission="access_billing_dashboard"><BillingDashboard /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute requiredPermission="access_billing_reports"><BillingReports /></ProtectedRoute>} />
      <Route path="/financial-statements" element={<ProtectedRoute requiredPermission="access_financial_statements"><FinancialStatements /></ProtectedRoute>} />
      <Route path="/client-portal" element={<ProtectedRoute><ClientPortal /></ProtectedRoute>} />
      
      {/* Admin Routes */}
      <Route path="/management" element={<ProtectedRoute requiredPermission="system_settings"><SystemManagement /></ProtectedRoute>} />
      <Route path="/settings/users" element={<ProtectedRoute requiredPermission="manage_users"><UserManagement /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;