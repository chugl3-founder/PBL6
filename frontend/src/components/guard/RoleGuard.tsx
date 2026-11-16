import React from 'react';
import { Navigate } from 'react-router-dom';
import { getSessionUser, isSignedIn } from '../../auth/session';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const user = getSessionUser();

  if (!isSignedIn()) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // Không đủ quyền -> chuyển về trang chủ
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

