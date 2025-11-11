import React from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomePage from './components/HomePage';
import CIPCManagement from './components/CIPCManagement';
import CustomerManagement from './components/CustomerManagement';
import SystemManagement from './components/SystemManagement';
import CalendarTaskManagement from './components/CalendarTaskManagement';
import AIInsights from './components/AIInsights';
import LoginPage from './components/LoginPage';
import DashboardAnalytics from './components/DashboardAnalytics';
import ClientPortal from './components/ClientPortal';
import ChatWidget from './components/ChatWidget';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading, login } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isLoggedIn()) {
    return <LoginPage onLoginSuccess={login} />;
  }
  
  return children;
};

// Main App Content
const AppContent = () => {
  const { login, isLoggedIn } = useAuth();
  
  return (
    <>
      <Routes>
        <Route 
          path="/login" 
          element={<LoginPage onLoginSuccess={login} />} 
        />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/cipc" 
          element={
            <ProtectedRoute>
              <CIPCManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/customers" 
          element={
            <ProtectedRoute>
              <CustomerManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/management" 
          element={
            <ProtectedRoute>
              <SystemManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/calendar" 
          element={
            <ProtectedRoute>
              <CalendarTaskManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/ai-insights" 
          element={
            <ProtectedRoute>
              <AIInsights />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardAnalytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/client-portal" 
          element={<ClientPortal />} 
        />
      </Routes>
      {isLoggedIn() && <ChatWidget />}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;