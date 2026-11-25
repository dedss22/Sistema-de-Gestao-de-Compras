import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Captura erros inesperados de renderização na árvore React e exibe uma tela
 * de recuperação amigável alinhada ao tema visual do sistema.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Erro inesperado na interface:', error, errorInfo);
  }

  handleRecarregar = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200/90 shadow-xl shadow-stone-900/5 space-y-5 animate-modal-in">
            <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-amber-200">
              <AlertTriangle size={32} aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-stone-900 tracking-tight">
                Algo deu errado por aqui
              </h1>
              <p className="text-sm text-stone-600 leading-relaxed font-medium">
                Ocorreu um erro inesperado ao exibir esta tela. Suas alterações salvas no aparelho não foram perdidas.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleRecarregar}
              className="w-full min-h-[46px] py-3.5 px-6 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-stone-950 font-black rounded-2xl text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer tap-bounce"
            >
              <RefreshCw size={18} strokeWidth={2.5} aria-hidden="true" />
              <span>Recarregar página</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
