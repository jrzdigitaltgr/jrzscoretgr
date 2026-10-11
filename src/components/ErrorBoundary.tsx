import React from "react";
import { AlertTriangle, RotateCcw, Home, Trash2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.href = window.location.pathname;
  };

  private handleClearCorruptStorage = () => {
    try {
      localStorage.removeItem("silat_seni_match_history");
      localStorage.removeItem("silat_seni_match_state");
      localStorage.removeItem("registered_athletes");
    } catch {}
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#040813] text-white flex items-center justify-center p-6 font-sans select-none">
          <div className="max-w-xl w-full bg-gradient-to-b from-[#09152b] via-[#060e1d] to-[#02050c] border-2 border-red-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(239,68,68,0.3)] text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-500/50 mx-auto flex items-center justify-center text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.4)]">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
                {this.props.fallbackTitle || "Terjadi Gangguan Tampilan"}
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Sistem mendeteksi galat komponen dan mencegah layar putih (blank screen).
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#020612] border border-[#162540] rounded-xl p-3 text-left font-mono text-[11px] text-red-300 overflow-x-auto max-h-36">
                <strong>Galat:</strong> {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <button
                onClick={this.handleReset}
                className="py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Coba Lagi</span>
              </button>

              <button
                onClick={this.handleReload}
                className="py-2.5 px-3 rounded-xl bg-[#0c1e3a] hover:bg-[#122b52] border border-cyan-500/40 text-cyan-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Home size={14} />
                <span>Menu Utama</span>
              </button>

              <button
                onClick={this.handleClearCorruptStorage}
                className="py-2.5 px-3 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                title="Bersihkan data sementara yang korup dan muat ulang"
              >
                <Trash2 size={14} />
                <span>Reset Data</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
