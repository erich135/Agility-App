import React, { createContext, useContext, useState, useEffect } from 'react';

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

  const logout = () => {
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

  const value = {
    user,
    login,
    logout,
    isAdmin,
    isLoggedIn,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;