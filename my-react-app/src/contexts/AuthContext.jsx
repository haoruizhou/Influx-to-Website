import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in when the app loads
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      const userStr = localStorage.getItem('user');
      
      if (token && userStr) {
        setIsLoggedIn(true);
        setUser(JSON.parse(userStr));
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const value = {
    user,
    isLoggedIn,
    loading,
    setUser,
    setIsLoggedIn
  };

return (
  <AuthContext.Provider value={value}>
    {children}
  </AuthContext.Provider>
);
};

// In AuthContext.jsx
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};