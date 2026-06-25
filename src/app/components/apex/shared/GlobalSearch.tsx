import { useRef, useState, useEffect } from 'react';
import { Search, User, Package, Briefcase, Loader2, X } from 'lucide-react';
import { Input } from '../../ui/input';
import { useGlobalSearch, type SearchResult } from '../../../../lib/hooks/useGlobalSearch';

const TYPE_META: Record<string, { icon: typeof User; color: string; label: string }> = {
  client:   { icon: User,      color: 'text-blue-500',  label: 'Client'   },
  specimen: { icon: Package,   color: 'text-green-500', label: 'Specimen' },
  job:      { icon: Briefcase, color: 'text-amber-500', label: 'Job'      },
};

interface GlobalSearchProps {
  onNavigate: (view: string) => void;
}

export function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { results, loading } = useGlobalSearch(query);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const showDropdown = open && (query.trim().length >= 2);

  function handleSelect(r: SearchResult) {
    onNavigate(r.nav_hint);
    setQuery('');
    setOpen(false);
  }

  function clear() {
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      <Input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Escape') clear(); }}
        placeholder="Search clients, tags, species…"
        className="pl-8 pr-8 h-8 text-sm bg-slate-50 dark:bg-[#2c3d5b] border-slate-200 dark:border-transparent focus:border-[#0073ea] dark:text-white"
      />
      {query && (
        <button
          onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {showDropdown && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-[#1c2b3a] border border-slate-200 dark:border-[#2c3d5b] rounded-xl shadow-2xl z-50 overflow-hidden">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">
              No results for "<span className="font-medium text-slate-600 dark:text-slate-300">{query}</span>"
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#2c3d5b]">
              {/* Group results by type */}
              {(['client', 'specimen', 'job'] as const).map(type => {
                const group = results.filter(r => r.result_type === type);
                if (!group.length) return null;
                const meta = TYPE_META[type];
                const Icon = meta.icon;
                return (
                  <div key={type}>
                    <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#162230]">
                      {meta.label}s
                    </p>
                    {group.map(r => (
                      <button
                        key={r.result_id}
                        onClick={() => handleSelect(r)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-[#2c3d5b] text-left transition-colors"
                      >
                        <div className={`w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#2c3d5b] flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{r.label}</p>
                          {r.sub_label && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.sub_label}</p>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${meta.color} bg-current/10`}
                          style={{ backgroundColor: undefined }}
                        >
                          <span className={`${meta.color}`}>{meta.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-4 py-2 border-t border-slate-100 dark:border-[#2c3d5b] flex items-center justify-between">
            <p className="text-[10px] text-slate-400">
              {results.length} result{results.length !== 1 ? 's' : ''} · press <kbd className="font-mono bg-slate-100 dark:bg-[#2c3d5b] px-1 rounded text-[9px]">Esc</kbd> to close
            </p>
            {results.length > 0 && (
              <button
                onClick={() => { onNavigate('clients'); clear(); }}
                className="text-[10px] text-[#0073ea] hover:underline"
              >
                View all in Clients →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
