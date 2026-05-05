import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TimerProvider } from './contexts/TimerContext';
import { FocusProvider } from './contexts/FocusContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import FocusSession from './components/FocusSession';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import SetupPassword from './components/SetupPassword';
import ResetPassword from './components/ResetPassword';
import CIPCManagement from './components/CIPCManagement';
import CustomersPage from './components/CustomersPage';
import BulkAssignCustomers from './components/BulkAssignCustomers';
import AdminPage from './components/AdminPage';
import CalendarTaskManagement from './components/CalendarTaskManagement';
import DashboardAnalytics from './components/DashboardAnalytics';
import ClientPortal from './components/ClientPortal';
import FinancialStatements from './components/FinancialStatements';
import DocumentManager from './components/DocumentManager';
import Billing from './components/Billing';
import Timesheet from './components/Timesheet';
import TimesheetNew from './components/TimesheetNew';
import TimesheetSimple from './components/TimesheetSimple';
import MyTimesheets from './components/MyTimesheets';
import ProjectManagement from './components/ProjectManagement';
import BillingDashboard from './components/BillingDashboard';
import BillingDashboardNew from './components/BillingDashboardNew';
import BillingSimple from './components/BillingSimple';
import BillingReports from './components/BillingReports';
import JobRegister from './components/JobRegister';
import EmailPage from './components/EmailPage';
import MeetingsPage from './components/MeetingsPage';

// Protected Route component with Layout
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
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view this page.</p>
            <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">Go to Home</a>
          </div>
        </div>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
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
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute requiredPermission="access_dashboard"><DashboardAnalytics /></ProtectedRoute>} />
      <Route path="/cipc" element={<ProtectedRoute requiredPermission="access_cipc"><CIPCManagement /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute requiredPermission="access_customers"><CustomersPage /></ProtectedRoute>} />
      <Route path="/customers/bulk-assign" element={<ProtectedRoute requiredPermission="customers_bulk_assign"><BulkAssignCustomers /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute requiredPermission="access_calendar"><CalendarTaskManagement /></ProtectedRoute>} />
      <Route path="/billing" element={<Navigate to="/billing/dashboard" replace />} />
      <Route path="/timesheet" element={<ProtectedRoute requiredPermission="access_timesheet"><TimesheetSimple /></ProtectedRoute>} />
      <Route path="/my-timesheets" element={<ProtectedRoute requiredPermission="access_my_timesheets"><MyTimesheets /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute requiredPermission="access_projects"><ProjectManagement /></ProtectedRoute>} />
      <Route path="/billing/dashboard" element={<ProtectedRoute requiredPermission="access_billing_dashboard"><BillingDashboard /></ProtectedRoute>} />
      <Route path="/billing/reports" element={<ProtectedRoute requiredPermission="access_billing_reports"><BillingReports /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute requiredPermission="access_documents"><DocumentManager /></ProtectedRoute>} />
      <Route path="/financial-statements" element={<ProtectedRoute requiredPermission="access_financial_statements"><FinancialStatements /></ProtectedRoute>} />
      <Route path="/client-portal" element={<ProtectedRoute><ClientPortal /></ProtectedRoute>} />
      <Route path="/focus" element={<ProtectedRoute><FocusSession /></ProtectedRoute>} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute requiredPermission="manage_users"><AdminPage /></ProtectedRoute>} />
      {/* Redirects for old admin URLs */}
      <Route path="/management" element={<Navigate to="/admin" replace />} />
      <Route path="/settings/users" element={<Navigate to="/admin?tab=users" replace />} />
      <Route path="/settings/document-categories" element={<Navigate to="/admin?tab=doc-categories" replace />} />
      <Route path="/person-register" element={<Navigate to="/customers?tab=persons" replace />} />
      <Route path="/jobs" element={<ProtectedRoute requiredPermission="access_customers"><JobRegister /></ProtectedRoute>} />
      <Route path="/email" element={<ProtectedRoute><EmailPage /></ProtectedRoute>} />
      <Route path="/meetings" element={<ProtectedRoute><MeetingsPage /></ProtectedRoute>} />
      <Route path="/settings/job-templates" element={<Navigate to="/admin?tab=job-templates" replace />} />
      <Route path="/settings/job-statuses" element={<Navigate to="/admin?tab=job-statuses" replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <TimerProvider>
          <FocusProvider>
            <Router>
              <AppRoutes />
            </Router>
          </FocusProvider>
        </TimerProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;