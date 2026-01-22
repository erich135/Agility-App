import React, { createContext, useContext, useState, useEffect } from 'react';
import ActivityLogger from '../lib/ActivityLogger';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on app load
  useEffect(() => {
    const checkSession = () => {
      try {
        // DEVELOPMENT MODE: Auto-login with dev user
        const DEV_MODE = false;
        if (DEV_MODE) {
          const devUser = {
            id: 'dev-user-id',
            email: 'dev@test.com',
            full_name: 'Dev User',
            role: 'admin',
            permissions: [
              'access_dashboard',
              'access_cipc',
              'access_customers',
              'access_calendar',
              'access_documents',
              'access_billing_dashboard',
              'access_billing_reports',
              'access_financial_statements',
              'manage_users',
              'manage_permissions',
              'system_settings',
              'customers_view_my',
              'customers_create',
              'customers_edit',
              'customers_delete',
              'customers_bulk_assign',
              'log_time',
              'view_time_entries',
              'documents_view',
              'documents_manage'
            ]
          };
          setUser(devUser);
          setLoading(false);
          return;
        }

        const storedUser = localStorage.getItem('agility_user');
        const loginTime = localStorage.getItem('agility_login_time');
        
        if (storedUser && loginTime) {
          const userData = JSON.parse(storedUser);
          const loginTimestamp = parseInt(loginTime);
          const now = Date.now();
          const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
          
          // Check if session is still valid
          if (now - loginTimestamp < sessionDuration) {
            setUser(userData);
          } else {
            // Session expired
            logout();
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('agility_user', JSON.stringify(userData));
    localStorage.setItem('agility_login_time', Date.now().toString());
  };

  const logout = async () => {
    // Log logout activity before clearing session
    if (user) {
      await ActivityLogger.logLogout(
        user.id,
        user.full_name || user.email,
        {
          logout_timestamp: new Date().toISOString(),
          email: user.email,
          role: user.role
        }
      );
    }
    
    setUser(null);
    localStorage.removeItem('agility_user');
    localStorage.removeItem('agility_login_time');
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isLoggedIn = () => {
    return !!user;
  };

  // Check if user has a specific permission
  const hasPermission = (permissionKey) => {
    if (!user) return false;
    // Removed automatic admin override to allow granular control
    // if (user.role === 'admin') return true; 
    return user.permissions?.includes(permissionKey) || false;
  };

  // Check if user has any of the given permissions
  const hasAnyPermission = (permissionKeys) => {
    if (!user) return false;
    // Removed automatic admin override to allow granular control
    // if (user.role === 'admin') return true; 
    return permissionKeys.some(key => user.permissions?.includes(key));
  };

  const value = {
    user,
    login,
    logout,
    isAdmin,
    isLoggedIn,
    hasPermission,
    hasAnyPermission,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;