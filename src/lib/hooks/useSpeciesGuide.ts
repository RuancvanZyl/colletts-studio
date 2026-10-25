/**
 * The animal guide: facts, hunting notes, Roland Ward record, tracks and real photos for each species.
 * Filled in by the workshop (Setup → Animal guide), read by hunters.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export interface GuideFact { kind: 'fact' | 'hunting' | 'cool'; text: string }
export interface Guide {
  species: string; summary: string | null; facts: GuideFact[];
  record_label: string | null; record_value: string | null; record_note: string | null; tracks_note: string | null;
}
export interface GuidePhoto { id: string; species: string; kind: 'animal' | 'tracks' | 'trophy' | 'habitat'; storage_path: string; url: string; caption: string | null; credit: string | null; sort_order: number }

export const PHOTO_KIND_LABEL: Record<string, string> = { animal: 'The animal', tracks: 'Tracks', trophy: 'A fine trophy', habitat: 'Where it lives' };
export const FACT_KIND_LABEL: Record<string, string> = { cool: 'Did you know?', fact: 'About the animal', hunting: 'Hunting notes' };

export const guidePhotoUrl = (path: string) => (supabase as any).storage.from('species-guide').getPublicUrl(path).data.publicUrl as string;

export async function loadGuide(species: string): Promise<{ guide: Guide | null; photos: GuidePhoto[] }> {
  const [g, p] = await Promise.all([
    (supabase as any).from('species_guide').select('*').eq('species', species).maybeSingle(),
    (supabase as any).from('species_photos').select('*').eq('species', species).order('sort_order').order('created_at'),
  ]);
  const guide: Guide | null = g.data ? { ...g.data, facts: Array.isArray(g.data.facts) ? g.data.facts : [] } : null;
  const photos: GuidePhoto[] = (p.data ?? []).map((r: any) => ({ ...r, url: guidePhotoUrl(r.storage_path) }));
  return { guide, photos };
}

/** Which animals already have a guide / photos (for the editor's list and the "i" markers). */
export async function loadGuideIndex(): Promise<Record<string, { guide: boolean; photos: number }>> {
  const [g, p] = await Promise.all([
    (supabase as any).from('species_guide').select('species, summary, facts, record_value'),
    (supabase as any).from('species_photos').select('species'),
  ]);
  const idx: Record<string, { guide: boolean; photos: number }> = {};
  for (const r of g.data ?? []) idx[r.species] = { guide: !!(r.summary || r.record_value || (Array.isArray(r.facts) && r.facts.length)), photos: 0 };
  for (const r of p.data ?? []) { idx[r.species] ??= { guide: false, photos: 0 }; idx[r.species].photos++; }
  return idx;
}

/** One fact per day, the same for everybody that day. */
export function useDailyFact(): { species: string; kind: string; text: string } | null {
  const [fact, setFact] = useState<{ species: string; kind: string; text: string } | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from('species_guide').select('species, facts').limit(300);
      const all: { species: string; kind: string; text: string }[] = [];
      for (const r of data ?? []) for (const f of (Array.isArray(r.facts) ? r.facts : [])) if (f?.text) all.push({ species: r.species, kind: f.kind, text: f.text });
      if (!all.length) return;
      const day = Math.floor(Date.now() / 86_400_000);
      setFact(all[day % all.length]);
    })();
  }, []);
  return fact;
}
