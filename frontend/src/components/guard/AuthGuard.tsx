import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isSignedIn } from '../../auth/session';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const location = useLocation();

  if (!isSignedIn()) {
    // Chưa đăng nhập -> chuyển hướng về trang login kèm return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

