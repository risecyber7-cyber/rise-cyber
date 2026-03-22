import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Firestore ${parsed.operationType} error: ${parsed.error}`;
            isFirestoreError = true;
          }
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#0a0a0a] text-red-500 font-mono flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#111] border border-red-500/20 rounded-lg p-8 shadow-2xl shadow-red-500/5 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-12 h-12" />
              </div>
            </div>
            <h1 className="text-xl font-bold mb-4 tracking-tighter uppercase">System Failure</h1>
            <div className="bg-black/50 p-4 rounded border border-red-500/10 mb-6 text-left overflow-auto max-h-40">
              <p className="text-xs text-red-500/80 leading-relaxed whitespace-pre-wrap">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-red-500 text-black font-bold rounded hover:bg-red-400 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              REBOOT SYSTEM
            </button>
            {isFirestoreError && (
              <p className="mt-4 text-[10px] text-red-500/40 uppercase tracking-widest">
                Check security rules and database connectivity
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
