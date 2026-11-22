import { useEffect, useState } from 'react';
import { Check, Copy, Lock, Mail, Pencil, Trash2, X } from 'lucide-react';
import {
  ORDER_STATUS_LIST,
  ORDER_STATUS_MAP,
  REFORM_CODES_MAP,
} from '../data/reformsCatalog';
import {
  formatCurrencyEur,
  isTerminalStatus,
  type Order,
  type OrderStatus,
} from '../types/order';

interface OrderDetailDrawerProps {
  order: Order | null;
  onClose: () => void;
  onEdit: (order: Order) => void;
  onEmailClient: (order: Order) => void;
  onStatusChange: (order: Order, nextStatus: OrderStatus) => Promise<void>;
  onDelete: (orderId: string) => Promise<void>;
}

function formatDateDisplay(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function OrderDetailDrawer({
  order,
  onClose,
  onEdit,
  onEmailClient,
  onStatusChange,
  onDelete,
}: OrderDetailDrawerProps) {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setConfirmingDelete(false);
    setActionError(null);
    setCopied(false);
  }, [order?.id]);

  useEffect(() => {
    if (!order) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting && !updatingStatus) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [order, deleting, updatingStatus, onClose]);

  if (!order) return null;

  const statusMeta = ORDER_STATUS_MAP[order.status];
  const locked = isTerminalStatus(order.status);

  const handleStatusSelect = async (nextStatus: OrderStatus) => {
    if (nextStatus === order.status || locked) return;
    setUpdatingStatus(true);
    setActionError(null);
    try {
      await onStatusChange(order, nextStatus);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'No se pudo actualizar el estado.'
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setActionError(null);
    try {
      await onDelete(order.id);
      onClose();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'No se pudo eliminar el pedido.'
      );
      setDeleting(false);
    }
  };

  const handleCopySummary = async () => {
    const lines = [
      `Matrícula: ${order.licensePlate}`,
      `Fecha de creación: ${formatDateDisplay(order.orderDate)}`,
      `Estado: ${statusMeta.label}`,
      `Vehículo: ${order.vehicleBrand}${order.vehicleModel ? ` ${order.vehicleModel}` : ''}`,
      `Códigos de reforma: ${order.reformCodes.join(', ')}`,
      `Reformas del vehículo: ${order.vehicleReforms}`,
      `Cliente: ${order.clientName}${order.clientContact ? ` (${order.clientContact})` : ''}`,
      `Precio laboratorio: ${formatCurrencyEur(order.labPrice)}`,
      `Precio final: ${formatCurrencyEur(order.finalPrice)}`,
      `Ganancia: ${formatCurrencyEur(order.profit)}`,
    ];
    if (order.notes) {
      lines.push(`Observaciones: ${order.notes}`);
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError('No se pudo copiar el resumen al portapapeles.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-detail-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-xl bg-white h-full border-l border-slate-200 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2
              id="order-detail-title"
              className="font-mono text-xl font-semibold tracking-wider text-slate-900 tabular-nums"
            >
              {order.licensePlate}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              <span>{order.vehicleBrand}</span>
              {order.vehicleModel && (
                <>
                  <span className="mx-1.5">·</span>
                  <span>{order.vehicleModel}</span>
                </>
              )}
              <span className="mx-1.5">·</span>
              <span className="font-mono tabular-nums">
                {formatDateDisplay(order.orderDate)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {actionError && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800"
            >
              {actionError}
            </div>
          )}

          {/* Status section */}
          <section className="pb-6 border-b border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-500">
                Estado del pedido
              </span>
              <span className={`text-sm font-semibold ${statusMeta.textClass}`}>
                {statusMeta.label}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-600">{statusMeta.description}</p>

            {locked ? (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center gap-2 text-xs text-slate-600">
                <Lock className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                <span>
                  Este expediente está cerrado y bloqueado para edición. Puedes consultar su ficha, copiar el resumen o eliminarlo.
                </span>
              </div>
            ) : (
              <div className="mt-4">
                <span className="block text-xs font-medium text-slate-700 mb-1.5">
                  Cambiar estado rápidamente
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ORDER_STATUS_LIST.map((st) => {
                    const active = st.value === order.status;
                    return (
                      <button
                        key={st.value}
                        type="button"
                        disabled={updatingStatus || active}
                        onClick={() => handleStatusSelect(st.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 disabled:opacity-50'
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Resumen económico */}
          <section className="pb-6 border-b border-slate-200">
            <h3 className="text-xs font-medium text-slate-500 mb-2.5">
              Desglose económico
            </h3>
            <div className="grid grid-cols-3 border border-slate-200 rounded-md divide-x divide-slate-200 bg-slate-50/50">
              <div className="px-3.5 py-2.5">
                <p className="text-[11px] font-medium text-slate-500">
                  Precio lab.
                </p>
                <p className="mt-1 font-mono text-sm font-medium text-slate-900 tabular-nums">
                  {formatCurrencyEur(order.labPrice)}
                </p>
              </div>
              <div className="px-3.5 py-2.5">
                <p className="text-[11px] font-medium text-slate-500">
                  Precio final
                </p>
                <p className="mt-1 font-mono text-sm font-medium text-slate-900 tabular-nums">
                  {formatCurrencyEur(order.finalPrice)}
                </p>
              </div>
              <div className="px-3.5 py-2.5">
                <p className="text-[11px] font-medium text-slate-500">
                  Ganancia
                </p>
                <p
                  className={`mt-1 font-mono text-sm font-semibold tabular-nums ${
                    order.profit > 0
                      ? 'text-emerald-700'
                      : order.profit < 0
                        ? 'text-rose-700'
                        : 'text-slate-700'
                  }`}
                >
                  {order.profit > 0 ? '+' : ''}
                  {formatCurrencyEur(order.profit)}
                </p>
              </div>
            </div>
          </section>

          {/* Cliente y Vehículo */}
          <section className="pb-6 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <h3 className="text-xs font-medium text-slate-500">Cliente</h3>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {order.clientName}
              </p>
              {order.clientContact && (
                <p className="mt-0.5 text-xs text-slate-600">
                  {order.clientContact}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-medium text-slate-500">
                Fecha de creación
              </h3>
              <p className="mt-1 text-sm font-mono tabular-nums text-slate-900">
                {formatDateDisplay(order.orderDate)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                {order.orderDate}
              </p>
            </div>
          </section>

          {/* Códigos de reforma */}
          <section className="pb-6 border-b border-slate-200">
            <h3 className="text-xs font-medium text-slate-500">
              Códigos de reforma ({order.reformCodes.length})
            </h3>
            <div className="mt-2.5 divide-y divide-slate-200 border border-slate-200 rounded-md">
              {order.reformCodes.map((code) => {
                const entry = REFORM_CODES_MAP[code];
                return (
                  <div key={code} className="px-3.5 py-2.5 text-xs">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                        CR {code}
                      </span>
                      <span className="text-slate-700 font-medium">
                        {entry ? entry.title : 'Código de reforma personalizado'}
                      </span>
                    </div>
                    {entry && (
                      <p className="mt-1 text-slate-500 leading-relaxed">
                        {entry.section} · {entry.summary}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Reformas del vehículo */}
          <section className="pb-6 border-b border-slate-200">
            <h3 className="text-xs font-medium text-slate-500">
              Reformas del vehículo
            </h3>
            <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {order.vehicleReforms}
            </p>
          </section>

          {/* Observaciones */}
          {order.notes && (
            <section className="pb-6 border-b border-slate-200">
              <h3 className="text-xs font-medium text-slate-500">
                Observaciones internas
              </h3>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {order.notes}
              </p>
            </section>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 shrink-0">
          {confirmingDelete ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-rose-800">
                ¿Eliminar definitivamente el pedido {order.licensePlate}?
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-rose-700 rounded-md hover:bg-rose-800 disabled:opacity-60 whitespace-nowrap"
                >
                  {deleting ? 'Eliminando...' : 'Confirmar eliminación'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>Eliminar</span>
              </button>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onEmailClient(order)}
                  className="px-3.5 py-2 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Enviar correo</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Copiar ficha</span>
                    </>
                  )}
                </button>

                {!locked && (
                  <button
                    type="button"
                    onClick={() => onEdit(order)}
                    className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Editar pedido</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
