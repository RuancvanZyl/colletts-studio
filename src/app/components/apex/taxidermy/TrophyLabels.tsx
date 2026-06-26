import { QRCodeSVG } from 'qrcode.react';
import { Printer, X } from 'lucide-react';
import { makePartTag, type TrophyPart } from '../../../../lib/trophyParts';

interface LabelTrophy {
  trophyIndex: number;
  species: string;
  mountType: string;
  tagNumber: string;
  parts: TrophyPart[];
}

interface TrophyLabelsProps {
  clientNumber: string;
  clientName: string;
  huntYear: number;
  trophies: LabelTrophy[];
  onClose: () => void;
}

export function TrophyLabels({ clientNumber, clientName, huntYear, trophies, onClose }: TrophyLabelsProps) {
  const allLabels: { tag: string; species: string; mountType: string; partLabel: string; trophyIndex: number }[] = [];

  for (const t of trophies) {
    for (const p of t.parts) {
      allLabels.push({
        tag: makePartTag(clientNumber, t.species, t.trophyIndex, p.code),
        species: t.species,
        mountType: t.mountType,
        partLabel: p.label,
        trophyIndex: t.trophyIndex,
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 print:hidden">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Trophy Part Labels</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {clientNumber} · {clientName} · {huntYear} · {allLabels.length} labels
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Labels
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Label grid */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3 print:p-4">
          {allLabels.map((label) => (
            <div
              key={label.tag}
              className="border-2 border-slate-800 dark:border-slate-200 rounded-xl p-3 flex flex-col items-center gap-2 bg-white text-black print:rounded print:border-slate-800"
            >
              {/* QR code */}
              <QRCodeSVG
                value={label.tag}
                size={100}
                level="M"
                className="rounded"
              />

              {/* Tag code */}
              <p className="font-mono text-xs font-bold text-center tracking-wider leading-tight break-all">
                {label.tag}
              </p>

              {/* Trophy info */}
              <div className="text-center border-t border-slate-200 pt-2 w-full">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">{label.species}</p>
                <p className="text-xs text-slate-600">{label.mountType}</p>
                <p className="text-xs font-semibold text-blue-700 mt-0.5">{label.partLabel}</p>
              </div>

              {/* Client strip */}
              <div className="w-full bg-slate-900 text-white rounded px-2 py-0.5 text-center">
                <p className="text-xs font-bold tracking-widest">{clientNumber}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Print-only header */}
        <div className="hidden print:block print:px-4 print:pb-4 text-xs text-slate-500 text-center">
          Apex Trophy Solutions · {clientName} ({clientNumber}) · {huntYear}
        </div>
      </div>

      <style>{`
        @media print {
          body > *:not(.fixed) { display: none !important; }
          .fixed { position: static !important; background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
