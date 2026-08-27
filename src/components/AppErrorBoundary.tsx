import React from 'react';

type State = {
  error: Error | null;
};

export default class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Erro ao renderizar UTM Builder', error);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f9fc] px-4 py-8">
        <div className="w-full max-w-xl rounded-[1.5rem] border border-red-200 bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Erro ao carregar</p>
          <h1 className="mt-3 text-2xl font-black text-gray-950">O UTM Builder não conseguiu abrir esta tela.</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Recarregue a página. Se continuar, limpe o cache desta aba ou abra em janela anônima para remover arquivos antigos do navegador.
          </p>
          <p className="mt-3 break-all rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-2xl bg-[linear-gradient(135deg,#ff940e_0%,#ff0e03_100%)] px-5 py-3 font-semibold text-white"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}
