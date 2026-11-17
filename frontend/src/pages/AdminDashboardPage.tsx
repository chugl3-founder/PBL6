import React from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import { AiMonitorSection } from '../components/admin/AiMonitorSection';
import { ContentSection } from '../components/admin/ContentSection';
import { MatchesSection } from '../components/admin/MatchesSection';
import { OverviewSection } from '../components/admin/OverviewSection';
import { UsersSection } from '../components/admin/UsersSection';
import type { AdminOutletContext } from '../components/layout/AdminLayout';

/**
 * The admin area. The route picks the section; each section loads and manages its own list. The
 * system numbers come from the layout, which also shows them as marks in the nav.
 */
export const AdminDashboardPage: React.FC = () => {
  const { pathname } = useLocation();
  const ctx = useOutletContext<AdminOutletContext>();

  if (pathname.startsWith('/admin/users')) return <UsersSection {...ctx} />;
  if (pathname.startsWith('/admin/ai-monitor')) return <AiMonitorSection {...ctx} />;
  if (pathname.startsWith('/admin/matches')) return <MatchesSection {...ctx} />;
  if (pathname.startsWith('/admin/content')) return <ContentSection {...ctx} />;
  return <OverviewSection {...ctx} />;
};
