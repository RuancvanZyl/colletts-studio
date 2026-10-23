/** SectionTabs — the row of related screens at the top of a section. Big, readable, scrolls sideways on a phone. */
export interface SectionTab { view: string; label: string; badge?: number | null }

export function SectionTabs({ tabs, active, onSelect }: { tabs: SectionTab[]; active: string; onSelect: (view: string) => void }) {
  if (tabs.length < 2) return null;
  return (
    <div className="mb-5 -mx-4 md:-mx-6 px-4 md:px-6 overflow-x-auto [scrollbar-width:none]" role="tablist">
      <div className="flex gap-2 min-w-max pb-1">
        {tabs.map(t => {
          const on = t.view === active;
          return (
            <button key={t.view} role="tab" aria-selected={on} onClick={() => onSelect(t.view)}
              className={`whitespace-nowrap rounded-full px-5 min-h-11 text-base font-semibold border-2 flex items-center gap-2 ${on ? 'bg-[#0073ea] border-[#0073ea] text-white' : 'border-slate-600 text-slate-200 hover:border-slate-400'}`}>
              {t.label}
              {t.badge != null && t.badge > 0 && <span className={`text-xs font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center ${on ? 'bg-white text-[#0073ea]' : 'bg-red-500 text-white'}`}>{t.badge > 99 ? '99+' : t.badge}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
