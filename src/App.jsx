import React from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomePage from './components/HomePage';
import CIPCManagement from './components/CIPCManagement';
import CustomerManagement from './components/CustomerManagement';
import LoginPage from './components/LoginPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  
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
    return <LoginPage onLoginSuccess={() => {}} />;
  }
  
  return children;
};

// Main App Content
const AppContent = () => {
  const { login } = useAuth();
  
  return (
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
    </Routes>
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