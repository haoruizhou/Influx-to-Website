import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();

  // If still checking authentication status, show loading
  if (loading) {
    return <div>Loading...</div>;
  }

  // If not logged in, redirect to login page
  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  // If logged in, show the protected content
  return children;
};

export default ProtectedRoute;