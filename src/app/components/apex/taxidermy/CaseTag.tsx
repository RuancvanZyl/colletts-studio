/** CaseTag — the red marker on a trophy with a rejected skin. It stays until the problem is solved. */
export interface OpenCase { id: string; reasons: string[]; held: boolean; overrideReason: string | null }

export function CaseTag({ c, onOpen }: { c: OpenCase; onOpen?: (id: string) => void }) {
  return (
    <div className="mt-1.5 rounded-lg border border-red-600 bg-red-950/30 px-2.5 py-1.5 text-[12px] leading-snug text-red-200">
      <p className="font-bold uppercase tracking-wide">Rejected skin{c.held ? ' · held aside' : ' · on hold'}</p>
      <p>{c.reasons.join(', ')}</p>
      {c.held && <p className="text-red-300/90">The order carries on without it. It stays red until it is replaced or cancelled.{c.overrideReason ? ` (${c.overrideReason})` : ''}</p>}
      {onOpen && <button type="button" onClick={() => onOpen(c.id)} className="underline font-semibold mt-0.5">Open the case</button>}
    </div>
  );
}
