import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, userData } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
    // If user does not have the right role, redirect them to their specific dashboard
    if (userData.role === 'admin') return <Navigate to="/admin" replace />;
    if (userData.role === 'teacher') return <Navigate to="/teacher" replace />;
    if (userData.role === 'parent') return <Navigate to="/parent" replace />;
    return <Navigate to="/login" replace />; // Fallback
  }

  return children;
};

export default ProtectedRoute;
