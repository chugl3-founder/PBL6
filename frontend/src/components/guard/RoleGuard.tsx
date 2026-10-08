import React from 'react';
import { Navigate } from 'react-router-dom';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('access_token');
  const userJson = localStorage.getItem('user_info');
  const user = userJson ? JSON.parse(userJson) : null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // Không đủ quyền -> chuyển về trang chủ
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

