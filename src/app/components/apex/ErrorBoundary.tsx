import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-stone-100 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            <h2 className="text-slate-900 dark:text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              We encountered an error while loading this page. Please try refreshing.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Refresh Page
            </Button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-slate-500 dark:text-slate-500 cursor-pointer">
                  Error details
                </summary>
                <pre className="mt-2 text-xs text-slate-600 dark:text-slate-400 overflow-auto p-2 bg-slate-50 dark:bg-slate-900 rounded">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
