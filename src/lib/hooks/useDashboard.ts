import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

interface DashboardSummary {
  jobs_in_progress: number;
  jobs_overdue: number;
  jobs_missing_date: number;
  jobs_stalled: number;
  specimens_received_today: number;
  shipments_today: number;
  low_stock_items: number;
  unacked_alerts: number;
}

interface RecentActivity {
  id: string;
  text: string;
  time: string;
  phase: string;
}

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const [summaryRes, activityRes, alertsRes] = await Promise.all([
      supabase.rpc('get_dashboard_summary'),
      supabase
        .from('job_phase_history')
        .select(`
          id, phase, entered_at,
          jobs(
            specimens(
              tag_number, species_name,
              species(common_name),
              clients(full_name)
            )
          )
        `)
        .order('entered_at', { ascending: false })
        .limit(10),
      supabase
        .from('v_active_alerts')
        .select('*')
        .or('is_overdue_paid.eq.true,is_missing_target_date.eq.true,is_stalled.eq.true')
        .limit(20),
    ]);

    if (summaryRes.data) setSummary(summaryRes.data as DashboardSummary);

    if (activityRes.data) {
      setRecentActivity(
        activityRes.data.map((row: any) => {
          const specimen = row.jobs?.specimens;
          const name = specimen?.species?.common_name ?? specimen?.species_name ?? 'Trophy';
          const tag = specimen?.tag_number ? ` #${specimen.tag_number}` : '';
          const client = specimen?.clients?.full_name ?? '';
          return {
            id: row.id,
            text: `${name}${tag} entered ${row.phase.replace(/_/g, ' ')}${client ? ` — ${client}` : ''}`,
            time: new Date(row.entered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            phase: row.phase,
          };
        })
      );
    }

    if (alertsRes.data) setAlerts(alertsRes.data);

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return { summary, recentActivity, alerts, loading, refresh: load };
}
