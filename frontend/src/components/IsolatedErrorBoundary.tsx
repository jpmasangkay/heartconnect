import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class IsolatedErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('IsolatedErrorBoundary caught error:', error, errorInfo);
  }

  public reset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 rounded-xl border border-red-200 bg-red-50/60 text-red-950 flex flex-col items-center text-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-red-900">
              {this.props.fallbackTitle || 'Component Encountered an Error'}
            </h4>
            <p className="text-xs text-red-700 mt-1 max-w-md">
              {this.props.fallbackMessage || this.state.error?.message || 'Something went wrong while rendering this section.'}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-red-300 text-red-800 hover:bg-red-100 hover:text-red-900 gap-1.5 text-xs"
            onClick={this.reset}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
