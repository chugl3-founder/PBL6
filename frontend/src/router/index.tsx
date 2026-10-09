import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { AuthGuard } from '../components/guard/AuthGuard';
import { RoleGuard } from '../components/guard/RoleGuard';

import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { MyMatchesPage } from '../pages/MyMatchesPage';
import { MatchReplayPage } from '../pages/MatchReplayPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { ProfilePage } from '../pages/ProfilePage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { CreateMatchPage } from '../pages/CreateMatchPage';
import { MatchDetailPage } from '../pages/MatchDetailPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* Public Routes (Guest & All) */}
        <Route index element={<HomePage />} />
        <Route path="public-matches" element={<HomePage />} />
        <Route path="public-matches/:id/replay" element={<MatchReplayPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />

        {/* Protected User Routes */}
        <Route
          path="profile"
          element={
            <AuthGuard>
              <ProfilePage />
            </AuthGuard>
          }
        />
        <Route
          path="matches/create"
          element={
            <AuthGuard>
              <CreateMatchPage />
            </AuthGuard>
          }
        />
        <Route
          path="matches/:id"
          element={
            <AuthGuard>
              <MatchDetailPage />
            </AuthGuard>
          }
        />
        <Route
          path="my-matches"
          element={
            <AuthGuard>
              <MyMatchesPage />
            </AuthGuard>
          }
        />
        <Route
          path="matches/:id/replay"
          element={
            <AuthGuard>
              <MatchReplayPage />
            </AuthGuard>
          }
        />

        {/* Protected Admin Routes */}
        <Route
          path="admin"
          element={
            <RoleGuard allowedRoles={['ROLE_ADMIN']}>
              <AdminDashboardPage />
            </RoleGuard>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

