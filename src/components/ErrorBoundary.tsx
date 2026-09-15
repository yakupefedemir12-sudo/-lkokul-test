import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = window.location.origin;
  };

  private handleClearAndReload = () => {
    try {
      // Clear potentially corrupted transient student sessions without wiping student rosters
      sessionStorage.clear();
      window.location.href = window.location.origin;
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="bg-white max-w-xl w-full rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-md shadow-amber-500/10">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                {this.props.fallbackTitle || 'Ufak Bir Aksaklık Yaşandı'}
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                {this.props.fallbackDescription ||
                  'Sayfa yüklenirken beklenmeyen bir durum meydana geldi. Endişelenmeyin, öğrenci ve sınav verileriniz güvende.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                id="error-boundary-reload-btn"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-5 py-3 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Sayfayı Yenile</span>
              </button>

              <button
                onClick={this.handleGoHome}
                id="error-boundary-home-btn"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Ana Sayfaya Git</span>
              </button>

              <button
                onClick={this.handleClearAndReload}
                id="error-boundary-reset-btn"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                title="Geçici oturumu sıfırla ve ana ekrana dön"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Oturumu Sıfırla</span>
              </button>
            </div>

            {/* Collapsible Error Technical Detail */}
            {this.state.error && (
              <div className="pt-4 border-t border-slate-100 text-left">
                <button
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer mx-auto"
                >
                  <span>{this.state.showDetails ? 'Teknik detayı gizle' : 'Teknik hata detayını göster'}</span>
                </button>

                {this.state.showDetails && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono text-rose-700 overflow-x-auto max-h-40">
                    <p className="font-bold">{this.state.error.toString()}</p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-[10px] text-slate-500 mt-1 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
