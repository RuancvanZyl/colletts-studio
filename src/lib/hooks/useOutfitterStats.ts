import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export interface SpeciesCount  { species: string; count: number }
export interface YearCount     { year: number;   count: number }
export interface MonthCount    { month: string;  count: number }
export interface OutfitterStats {
  totalTrophies:   number;
  totalHunts:      number;
  totalHunters:    number;
  totalIndependent: number;
  topSpecies:      SpeciesCount[];
  allSpecies:      SpeciesCount[];
  byYear:          YearCount[];
  byMonth:         MonthCount[];   // last 12 months
  byOperator:      { operator: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  completedTrophies: number;
  inProgressTrophies: number;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function useOutfitterStats() {
  const [stats,   setStats]   = useState<OutfitterStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const [huntsRes, docsRes] = await Promise.all([
      (supabase as any)
        .from('client_hunts')
        .select('id, year, operator, client_id, created_at, status'),
      (supabase as any)
        .from('hunt_documents')
        .select('hunt_id, doc_type, status, form_data')
        .eq('doc_type', 'job_card'),
    ]);

    const hunts    = huntsRes.data  ?? [];
    const jobCards = docsRes.data   ?? [];

    // Species breakdown
    const speciesMap: Record<string, number> = {};
    for (const jc of jobCards) {
      const sp = jc.form_data?.species;
      if (sp) speciesMap[sp] = (speciesMap[sp] ?? 0) + (jc.form_data?.quantity ?? 1);
    }
    const allSpecies = Object.entries(speciesMap)
      .map(([species, count]) => ({ species, count }))
      .sort((a, b) => b.count - a.count);

    // Hunts by year
    const yearMap: Record<number, number> = {};
    for (const h of hunts) yearMap[h.year] = (yearMap[h.year] ?? 0) + 1;
    const byYear = Object.entries(yearMap)
      .map(([year, count]) => ({ year: Number(year), count }))
      .sort((a, b) => a.year - b.year);

    // Hunts by month (last 12)
    const now = new Date();
    const monthMap: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthMap[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
    }
    for (const h of hunts) {
      const d    = new Date(h.created_at);
      const key  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in monthMap) monthMap[key]++;
    }
    const byMonth = Object.entries(monthMap).map(([key, count]) => {
      const [yr, mo] = key.split('-');
      return { month: `${MONTH_NAMES[parseInt(mo) - 1]} ${yr.slice(2)}`, count };
    });

    // By operator
    const operatorMap: Record<string, number> = {};
    for (const h of hunts) {
      const op = h.operator ?? 'Unknown';
      operatorMap[op] = (operatorMap[op] ?? 0) + 1;
    }
    const byOperator = Object.entries(operatorMap)
      .map(([operator, count]) => ({ operator, count }))
      .sort((a, b) => b.count - a.count);

    // Status breakdown
    const statusMap: Record<string, number> = {};
    for (const jc of jobCards) {
      statusMap[jc.status] = (statusMap[jc.status] ?? 0) + 1;
    }
    const statusBreakdown = Object.entries(statusMap)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    setStats({
      totalTrophies:    jobCards.length,
      totalHunts:       hunts.length,
      totalHunters:     new Set(hunts.map((h: any) => h.client_id)).size,
      totalIndependent: hunts.filter((h: any) => h.operator === 'Independent').length,
      topSpecies:       allSpecies.slice(0, 5),
      allSpecies,
      byYear,
      byMonth,
      byOperator,
      statusBreakdown,
      completedTrophies:  jobCards.filter((j: any) => j.status === 'completed').length,
      inProgressTrophies: jobCards.filter((j: any) => j.status === 'in_progress').length,
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  return { stats, loading, refresh: load };
}
