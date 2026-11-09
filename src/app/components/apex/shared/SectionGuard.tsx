/** SectionGuard — if one part of a screen fails, only that part says so (in plain words, with the reason) and the rest of the screen keeps working. */
import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface State { error: Error | null }

export class SectionGuard extends Component<{ children: ReactNode; what?: string }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error) { console.error('Part of the screen failed:', error); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="rounded-xl border-2 border-red-500 bg-red-50 dark:bg-red-950/30 p-4 space-y-2">
        <p className="font-bold text-red-800 dark:text-red-200 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />{this.props.what ?? 'This part'} could not be shown</p>
        <p className="text-sm text-red-900 dark:text-red-100">Everything else still works. Please tell the person who looks after the app, and send them what is written below.</p>
        <pre className="text-xs whitespace-pre-wrap break-words rounded bg-white/70 dark:bg-slate-900/60 p-2 text-slate-800 dark:text-slate-200">{String(this.state.error.message ?? this.state.error)}</pre>
        <button type="button" className="min-h-11 px-4 rounded-lg border-2 border-red-600 text-red-700 dark:text-red-300 font-bold" onClick={() => this.setState({ error: null })}>Try again</button>
      </div>
    );
  }
}
