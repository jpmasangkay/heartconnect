import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (
      error.name === 'ChunkLoadError' ||
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('dynamic import')
    ) {
      // Reload the page silently to fetch the latest JS bundles from the server
      window.sessionStorage.setItem('chunk_load_failed', 'true');
      if (window.sessionStorage.getItem('chunk_load_failed_count') !== 'true') {
        window.sessionStorage.setItem('chunk_load_failed_count', 'true');
        window.location.reload();
        return;
      }
    }
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload(); // better to hard refresh on random crashes
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-cream flex items-center justify-center p-6">
          <div className="bg-white border border-stone-border rounded-xl p-8 max-w-md w-full text-center shadow-sm">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h2>
            <p className="text-sm text-stone-muted mb-4">
              An unexpected error occurred. Please try again.
            </p>
            {this.state.error && (
              <div className="bg-red-50 text-red-800 text-xs p-3 rounded text-left overflow-x-auto mb-5 border border-red-100 font-mono">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleRetry}
              className="bg-navy hover:bg-navy-light text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
