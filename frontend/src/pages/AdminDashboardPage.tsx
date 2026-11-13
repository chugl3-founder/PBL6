import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getDashboardMetrics } from '../api/admin';
import { AiMonitorSection } from '../components/admin/AiMonitorSection';
import { LoadError } from '../components/admin/adminUi';
import { loadErrorText } from '../components/admin/adminFormat';
import { MatchesSection } from '../components/admin/MatchesSection';
import { OverviewSection } from '../components/admin/OverviewSection';
import { UsersSection } from '../components/admin/UsersSection';
import type { DashboardMetrics } from '../types/admin';

type AdminSection = 'OVERVIEW' | 'MATCHES' | 'USERS' | 'AI_MONITOR';

/** While analyses run, the overview numbers refresh this often. */
const METRICS_POLL_MS = 5000;

const sectionOf = (pathname: string): AdminSection => {
  if (pathname.includes('/users')) return 'USERS';
  if (pathname.includes('/ai-monitor')) return 'AI_MONITOR';
  if (pathname.includes('/matches')) return 'MATCHES';
  return 'OVERVIEW';
};

/**
 * The admin area. The route picks the section; each section loads and manages its own list. The page keeps
 * what they share: the overview numbers (shown in every section's summary cards) and the feedback banner.
 */
export const AdminDashboardPage: React.FC = () => {
  const location = useLocation();
  const activeSection = sectionOf(location.pathname);

  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDashboardMetrics = async () => {
    try {
      setMetricsLoading(true);
      setDashboardMetrics(await getDashboardMetrics());
      setMetricsError(null);
    } catch (err) {
      console.error('Lỗi khi tải chỉ số tổng quan Dashboard Admin:', err);
      setMetricsError(loadErrorText(err, 'số liệu tổng quan'));
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  // Keep the numbers current while analyses run; the AI monitor refreshes them itself.
  const analysesRunning = (dashboardMetrics?.processingAiAnalyses ?? 0) > 0;
  useEffect(() => {
    if (!analysesRunning || activeSection === 'AI_MONITOR') return;
    const timer = setInterval(() => {
      if (!document.hidden) fetchDashboardMetrics();
    }, METRICS_POLL_MS);
    return () => clearInterval(timer);
  }, [analysesRunning, activeSection]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  const sectionProps = { dashboardMetrics, showFeedback, onChanged: fetchDashboardMetrics };

  return (
    <div className="space-y-6 pb-12 min-w-0">
      {metricsError && <LoadError message={metricsError} onRetry={fetchDashboardMetrics} />}
      {/* Thông báo phản hồi chung */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl border text-sm font-medium flex items-center justify-between gap-2.5 transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-white/50 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeSection === 'OVERVIEW' && (
        <OverviewSection
          dashboardMetrics={dashboardMetrics}
          metricsLoading={metricsLoading}
          fetchDashboardMetrics={fetchDashboardMetrics}
        />
      )}
      {activeSection === 'MATCHES' && <MatchesSection {...sectionProps} />}
      {activeSection === 'USERS' && <UsersSection {...sectionProps} />}
      {activeSection === 'AI_MONITOR' && <AiMonitorSection {...sectionProps} />}
    </div>
  );
};
