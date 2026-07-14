import { useEffect, useRef, useState } from 'react';
import { ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Captures input from a USB/Bluetooth barcode or RFID "keyboard wedge"
 * reader: it types the code as fast keystrokes then sends Enter. We keep a
 * hidden input focused at all times so a volunteer never has to click
 * anything for the scan to register, and expose a visible fallback field
 * for manual entry when a chip won't read.
 */
export function ScannerInput({
  onScan,
  disabled,
  placeholder = 'Scan chip…',
  autoFocus = true,
}: {
  onScan: (code: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [manualValue, setManualValue] = useState('');
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!autoFocus) return;
    const refocus = () => {
      if (!disabled) inputRef.current?.focus();
    };
    refocus();
    const interval = setInterval(refocus, 1000);
    document.addEventListener('click', refocus);
    return () => {
      clearInterval(interval);
      document.removeEventListener('click', refocus);
    };
  }, [disabled, autoFocus]);

  function submit(raw: string) {
    const code = raw.trim();
    if (!code) return;
    onScan(code);
    setManualValue('');
    setActive(true);
    setTimeout(() => setActive(false), 220);
  }

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 transition-colors',
          active ? 'border-teal-glow bg-teal-glow/10' : 'border-white/10 bg-white/[0.04]',
        )}
      >
        <ScanLine className={cn('size-6 shrink-0', active ? 'text-teal-glow' : 'text-white/40')} />
        <input
          ref={inputRef}
          value={manualValue}
          disabled={disabled}
          onChange={(e) => setManualValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit(manualValue);
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-lg font-mono tracking-wide text-white placeholder:text-white/30 focus:outline-none"
          autoComplete="off"
        />
      </div>
      <p className="mt-1.5 text-xs text-white/35">
        Ready for scanner input — or type the chip code and press Enter.
      </p>
    </div>
  );
}
