import React from 'react';

type Props = { children: React.ReactNode; fallback?: React.ReactNode };
type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Hook for Sentry/etc.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div role="alert" className="p-4 border border-crit/40 rounded bg-crit/5 text-crit">
            <div className="font-semibold">Etwas ist schiefgelaufen.</div>
            <div className="text-sm opacity-80">
              Bitte die Seite neu laden oder später erneut versuchen.
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
