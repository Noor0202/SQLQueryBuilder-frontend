import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  // 1. Show a loading state while checking the session
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading session...
      </div>
    );
  }

  // 2. If no user is found, redirect to Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. If user exists, render the child route (e.g., Dashboard)
  return <Outlet />;
};

export default ProtectedRoute;