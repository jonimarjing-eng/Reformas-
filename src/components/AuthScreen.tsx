import { useState } from 'react';
import { googleSignInWithGmail } from '../lib/firebase';

const PREVIEW_ROWS = [
  {
    plate: '4821 KLP',
    date: '2026-11-17',
    status: 'Pendiente laboratorio',
    statusClass: 'text-blue-700',
    brand: 'Volkswagen Transporter',
    codes: '8.20 · 8.30',
    profit: '+280,00 €',
  },
  {
    plate: '7934 MBN',
    date: '2026-11-15',
    status: 'Pendiente ITV',
    statusClass: 'text-emerald-700',
    brand: 'BMW Serie 3',
    codes: '5.1 · 4.4',
    profit: '+175,00 €',
  },
  {
    plate: '2190 HTR',
    date: '2026-11-13',
    status: 'Pendiente cliente',
    statusClass: 'text-amber-700',
    brand: 'Toyota Land Cruiser',
    codes: '5.1 · 8.51',
    profit: '+245,00 €',
  },
  {
    plate: '6052 JVC',
    date: '2026-11-09',
    status: 'Pend. mod. VPlus',
    statusClass: 'text-violet-700',
    brand: 'Mercedes-Benz Sprinter',
    codes: '10.1 · 8.1',
    profit: '+150,00 €',
  },
];

export function AuthScreen() {
  const [signingIn, setSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setErrorMessage(null);
    try {
      await googleSignInWithGmail();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('popup-closed-by-user')) {
        setErrorMessage('Has cerrado la ventana de inicio de sesión antes de completar el acceso.');
      } else if (msg.includes('popup-blocked')) {
        setErrorMessage('El navegador ha bloqueado la ventana emergente. Permite las ventanas emergentes para continuar.');
      } else {
        setErrorMessage('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 px-6 lg:px-10 flex items-center justify-between gap-8">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          AutoReforma
        </span>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a href="#registro" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Registro de pedidos
          </a>
          <a href="#codigos" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Códigos CR
          </a>
          <a href="#clientes" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
            Clientes
          </a>
        </nav>
        <div className="shrink-0">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 whitespace-nowrap shrink-0"
          >
            {signingIn ? 'Conectando...' : 'Iniciar sesión'}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1320px] w-full mx-auto px-6 lg:px-10 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between" id="registro">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Gestión de homologaciones y reformas de vehículos
              </p>
              <h1
                className="mt-3 font-display text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 max-w-2xl"
                style={{ textWrap: 'balance' }}
              >
                Control centralizado de cada pedido de reforma desde la recepción hasta la ITV
              </h1>
              <p className="mt-4 text-base text-slate-600 max-w-xl leading-relaxed">
                Registra matrículas, fechas de creación, estado del expediente, marca del vehículo, códigos de reforma del Manual ITV, descripción técnica de intervenciones y datos del cliente en un único panel sincronizado en la nube.
              </p>
            </div>

            <div className="mt-10 bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium text-slate-900">Vista previa del libro de pedidos</span>
                <span className="font-mono tabular-nums">4 expedientes</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 bg-slate-50/70">
                      <th className="py-2.5 px-4 font-medium">Matrícula</th>
                      <th className="py-2.5 px-4 font-medium">Fecha</th>
                      <th className="py-2.5 px-4 font-medium">Estado</th>
                      <th className="py-2.5 px-4 font-medium">Vehículo</th>
                      <th className="py-2.5 px-4 font-medium">Códigos CR</th>
                      <th className="py-2.5 px-4 font-medium text-right">Ganancia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {PREVIEW_ROWS.map((row) => (
                      <tr key={row.plate} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {row.plate}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                          {row.date}
                        </td>
                        <td className={`py-3 px-4 font-medium whitespace-nowrap ${row.statusClass}`}>
                          {row.status}
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {row.brand}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                          {row.codes}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-emerald-700 text-right tabular-nums whitespace-nowrap">
                          {row.profit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="bg-white border border-slate-200 rounded-lg p-8 lg:p-10">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Accede a tu espacio de trabajo
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Tus pedidos quedan asociados exclusivamente a tu cuenta de Google y sincronizados automáticamente en cualquier dispositivo.
              </p>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  className="w-full min-h-[44px] px-5 py-3 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-60 transition-colors flex items-center justify-center gap-3 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  <svg
                    className="w-5 h-5 shrink-0"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>
                    {signingIn
                      ? 'Conectando con Google...'
                      : 'Iniciar sesión con Google'}
                  </span>
                </button>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800"
                >
                  {errorMessage}
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-200 space-y-3 text-xs text-slate-600">
                <div id="codigos">
                  <span className="font-medium text-slate-900">Catálogo de códigos CR incluido</span>
                  <span className="mx-1.5 text-slate-400">·</span>
                  <span>Selección ágil de códigos del Manual de Reformas RD 866/2010 y soporte para códigos personalizados.</span>
                </div>
                <div id="clientes">
                  <span className="font-medium text-slate-900">Directorio de clientes y exportación CSV</span>
                  <span className="mx-1.5 text-slate-400">·</span>
                  <span>Agrupación automática por cliente, búsqueda instantánea por matrícula y descarga en hoja de cálculo.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
