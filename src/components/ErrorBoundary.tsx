import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isPermissionError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      isPermissionError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = error.message || 'Ha ocurrido un error inesperado.';
    let isPermissionError = false;

    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') {
        message = parsed.error;
        if (
          parsed.error.toLowerCase().includes('permission') ||
          parsed.error.toLowerCase().includes('insufficient')
        ) {
          isPermissionError = true;
        }
      }
    } catch {
      if (message.toLowerCase().includes('permission')) {
        isPermissionError = true;
      }
    }

    return {
      hasError: true,
      message,
      isPermissionError,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error, info);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg p-8">
            <h1 className="font-display text-xl font-bold text-slate-900">
              {this.state.isPermissionError
                ? 'Error de permisos en la base de datos'
                : 'No se pudo completar la operación'}
            </h1>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              {this.state.isPermissionError
                ? 'Tu sesión actual no tiene permisos suficientes para ejecutar esta consulta o escritura en Firestore. Verifica que has iniciado sesión correctamente.'
                : 'Se ha producido un fallo al comunicarse con el servicio de datos.'}
            </p>
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-700 break-words">
              {this.state.message}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 whitespace-nowrap"
              >
                Recargar aplicación
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
