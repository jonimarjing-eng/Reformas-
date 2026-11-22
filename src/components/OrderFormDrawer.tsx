import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import {
  ORDER_STATUS_LIST,
  REFORM_CODES_CATALOG,
  REFORM_CODES_MAP,
  VEHICLE_BRANDS,
} from '../data/reformsCatalog';
import {
  calculateProfit,
  formatCurrencyEur,
  getTodayIsoDate,
  isTerminalStatus,
  normalizeLicensePlate,
  normalizeReformCode,
  ORDER_VALIDATION,
  parsePriceInput,
  validateOrderForm,
  type Order,
  type OrderFormValues,
  type OrderStatus,
  type ValidationErrors,
} from '../types/order';

interface OrderFormDrawerProps {
  isOpen: boolean;
  editingOrder: Order | null;
  initialReformCode?: string | null;
  onClose: () => void;
  onSubmit: (values: OrderFormValues, editingOrderId?: string) => Promise<void>;
}

function buildInitialValues(
  editingOrder: Order | null,
  initialReformCode?: string | null
): OrderFormValues {
  if (editingOrder) {
    return {
      licensePlate: editingOrder.licensePlate,
      orderDate: editingOrder.orderDate,
      status: editingOrder.status,
      vehicleBrand: editingOrder.vehicleBrand,
      vehicleModel: editingOrder.vehicleModel ?? '',
      reformCodes: [...editingOrder.reformCodes],
      vehicleReforms: editingOrder.vehicleReforms,
      clientName: editingOrder.clientName,
      clientContact: editingOrder.clientContact ?? '',
      labPrice: editingOrder.labPrice.toFixed(2),
      finalPrice: editingOrder.finalPrice.toFixed(2),
      notes: editingOrder.notes ?? '',
    };
  }

  return {
    licensePlate: '',
    orderDate: getTodayIsoDate(),
    status: 'pendiente_laboratorio',
    vehicleBrand: '',
    vehicleModel: '',
    reformCodes: initialReformCode ? [normalizeReformCode(initialReformCode)] : [],
    vehicleReforms: '',
    clientName: '',
    clientContact: '',
    labPrice: '',
    finalPrice: '',
    notes: '',
  };
}

export function OrderFormDrawer({
  isOpen,
  editingOrder,
  initialReformCode,
  onClose,
  onSubmit,
}: OrderFormDrawerProps) {
  const [values, setValues] = useState<OrderFormValues>(() =>
    buildInitialValues(editingOrder, initialReformCode)
  );
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [codeInput, setCodeInput] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValues(buildInitialValues(editingOrder, initialReformCode));
      setErrors({});
      setSubmitError(null);
      setCodeInput('');
      setCatalogSearch('');
      setShowCatalogPicker(false);
    }
  }, [isOpen, editingOrder, initialReformCode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, onClose]);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return REFORM_CODES_CATALOG;
    return REFORM_CODES_CATALOG.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q)
    );
  }, [catalogSearch]);

  if (!isOpen) return null;

  const addReformCode = (rawCode: string) => {
    const normalized = normalizeReformCode(rawCode);
    if (!normalized) return;
    setValues((prev) => {
      if (prev.reformCodes.includes(normalized)) return prev;
      if (prev.reformCodes.length >= ORDER_VALIDATION.REFORM_CODES_MAX) {
        return prev;
      }
      return { ...prev, reformCodes: [...prev.reformCodes, normalized] };
    });
    setErrors((prev) => ({ ...prev, reformCodes: undefined }));
  };

  const handleManualCodeAdd = () => {
    const parts = codeInput
      .split(/[,;\s]+/)
      .map(normalizeReformCode)
      .filter((c) => c.length > 0);
    if (parts.length === 0) return;

    setValues((prev) => {
      const next = [...prev.reformCodes];
      for (const code of parts) {
        if (
          !next.includes(code) &&
          next.length < ORDER_VALIDATION.REFORM_CODES_MAX
        ) {
          next.push(code);
        }
      }
      return { ...prev, reformCodes: next };
    });
    setCodeInput('');
    setErrors((prev) => ({ ...prev, reformCodes: undefined }));
  };

  const removeReformCode = (codeToRemove: string) => {
    setValues((prev) => ({
      ...prev,
      reformCodes: prev.reformCodes.filter((c) => c !== codeToRemove),
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // If the user typed a code in the input without clicking Añadir, include it automatically
    let finalValues = values;
    if (codeInput.trim().length > 0) {
      const pendingCodes = codeInput
        .split(/[,;\s]+/)
        .map(normalizeReformCode)
        .filter((c) => c.length > 0);
      if (pendingCodes.length > 0) {
        const merged = Array.from(
          new Set([...values.reformCodes, ...pendingCodes])
        ).slice(0, ORDER_VALIDATION.REFORM_CODES_MAX);
        finalValues = { ...values, reformCodes: merged };
        setValues(finalValues);
        setCodeInput('');
      }
    }

    const validation = validateOrderForm(finalValues);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(finalValues, editingOrder?.id);
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el pedido. Inténtalo de nuevo.';
      setSubmitError(msg);
    } finally {
      setSaving(false);
    }
  };

  const parsedLab = parsePriceInput(values.labPrice);
  const parsedFinal = parsePriceInput(values.finalPrice);
  const hasLiveProfit = !Number.isNaN(parsedLab) && !Number.isNaN(parsedFinal);
  const liveProfit = hasLiveProfit ? calculateProfit(parsedLab, parsedFinal) : 0;
  const willLockOrder = isTerminalStatus(values.status);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-form-title"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-2xl bg-white h-full border-l border-slate-200 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2
              id="order-form-title"
              className="font-display text-lg font-bold text-slate-900"
            >
              {editingOrder
                ? `Editar pedido · ${editingOrder.licensePlate}`
                : 'Registrar nuevo pedido'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Completa los datos obligatorios del expediente de reforma.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar formulario"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleFormSubmit}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
          noValidate
        >
          {submitError && (
            <div
              role="alert"
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800"
            >
              {submitError}
            </div>
          )}

          {/* Row 1: Matrícula, Fecha de creación, Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="licensePlate"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Matrícula *
              </label>
              <input
                id="licensePlate"
                type="text"
                value={values.licensePlate}
                onChange={(e) => {
                  const next = e.target.value.toUpperCase();
                  setValues((prev) => ({ ...prev, licensePlate: next }));
                  setErrors((prev) => ({ ...prev, licensePlate: undefined }));
                }}
                onBlur={() =>
                  setValues((prev) => ({
                    ...prev,
                    licensePlate: normalizeLicensePlate(prev.licensePlate),
                  }))
                }
                placeholder="4821 KLP"
                maxLength={ORDER_VALIDATION.LICENSE_PLATE_MAX}
                className="w-full h-10 px-3 font-mono text-sm uppercase tracking-wider text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              />
              {errors.licensePlate && (
                <p className="mt-1 text-xs text-rose-700">{errors.licensePlate}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="orderDate"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Fecha de creación *
              </label>
              <input
                id="orderDate"
                type="date"
                value={values.orderDate}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, orderDate: e.target.value }));
                  setErrors((prev) => ({ ...prev, orderDate: undefined }));
                }}
                className="w-full h-10 px-3 font-mono text-sm tabular-nums text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              />
              {errors.orderDate && (
                <p className="mt-1 text-xs text-rose-700">{errors.orderDate}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Estado del pedido *
              </label>
              <select
                id="status"
                value={values.status}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    status: e.target.value as OrderStatus,
                  }))
                }
                className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              >
                {ORDER_STATUS_LIST.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {willLockOrder && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700">
              Al guardar el pedido en estado{' '}
              <span className="font-semibold">
                {values.status === 'terminado' ? 'Terminado' : 'Cancelado'}
              </span>
              , el expediente quedará cerrado y bloqueado frente a modificaciones posteriores.
            </div>
          )}

          {/* Row 2: Importes económicos (Precio laboratorio, Precio final, Ganancia) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label
                htmlFor="labPrice"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Precio laboratorio (€) *
              </label>
              <input
                id="labPrice"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max={ORDER_VALIDATION.PRICE_MAX}
                value={values.labPrice}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, labPrice: e.target.value }));
                  setErrors((prev) => ({ ...prev, labPrice: undefined }));
                }}
                placeholder="0.00"
                className="w-full h-10 px-3 font-mono text-sm tabular-nums text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              />
              {errors.labPrice && (
                <p className="mt-1 text-xs text-rose-700">{errors.labPrice}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="finalPrice"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Precio final (€) *
              </label>
              <input
                id="finalPrice"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max={ORDER_VALIDATION.PRICE_MAX}
                value={values.finalPrice}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, finalPrice: e.target.value }));
                  setErrors((prev) => ({ ...prev, finalPrice: undefined }));
                }}
                placeholder="0.00"
                className="w-full h-10 px-3 font-mono text-sm tabular-nums text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              />
              {errors.finalPrice && (
                <p className="mt-1 text-xs text-rose-700">{errors.finalPrice}</p>
              )}
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">
                Ganancia (calculada)
              </span>
              <div
                aria-live="polite"
                className={`w-full h-10 px-3 font-mono text-sm font-semibold tabular-nums bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between ${
                  !hasLiveProfit
                    ? 'text-slate-400'
                    : liveProfit > 0
                      ? 'text-emerald-700'
                      : liveProfit < 0
                        ? 'text-rose-700'
                        : 'text-slate-700'
                }`}
              >
                <span>
                  {hasLiveProfit
                    ? `${liveProfit > 0 ? '+' : ''}${formatCurrencyEur(liveProfit)}`
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: Marca y Modelo del vehículo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="vehicleBrand"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Marca del vehículo *
              </label>
              <input
                id="vehicleBrand"
                type="text"
                list="vehicle-brands-datalist"
                value={values.vehicleBrand}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, vehicleBrand: e.target.value }));
                  setErrors((prev) => ({ ...prev, vehicleBrand: undefined }));
                }}
                placeholder="Ej. Volkswagen, BMW, Toyota..."
                maxLength={ORDER_VALIDATION.BRAND_MAX}
                className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              />
              <datalist id="vehicle-brands-datalist">
                {VEHICLE_BRANDS.map((brand) => (
                  <option key={brand} value={brand} />
                ))}
              </datalist>
              {errors.vehicleBrand && (
                <p className="mt-1 text-xs text-rose-700">{errors.vehicleBrand}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="vehicleModel"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Modelo (opcional)
              </label>
              <input
                id="vehicleModel"
                type="text"
                value={values.vehicleModel}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, vehicleModel: e.target.value }));
                  setErrors((prev) => ({ ...prev, vehicleModel: undefined }));
                }}
                placeholder="Ej. Transporter T6.1, Golf GTI..."
                maxLength={ORDER_VALIDATION.MODEL_MAX}
                className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              />
              {errors.vehicleModel && (
                <p className="mt-1 text-xs text-rose-700">{errors.vehicleModel}</p>
              )}
            </div>
          </div>

          {/* Row 3: Códigos de reforma */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="reformCodeInput"
                className="block text-xs font-medium text-slate-700"
              >
                Códigos de reforma (CR) *
              </label>
              <button
                type="button"
                onClick={() => setShowCatalogPicker((prev) => !prev)}
                className="text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors whitespace-nowrap"
              >
                {showCatalogPicker
                  ? 'Ocultar catálogo CR'
                  : 'Seleccionar del catálogo CR'}
              </button>
            </div>

            <div className="flex gap-2">
              <input
                id="reformCodeInput"
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualCodeAdd();
                  }
                }}
                placeholder="Escribe uno o varios códigos (ej. 5.1, 4.4, 8.52) y pulsa Añadir"
                className="flex-1 h-10 px-3 font-mono text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              />
              <button
                type="button"
                onClick={handleManualCodeAdd}
                className="h-10 px-4 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Añadir</span>
              </button>
            </div>

            {errors.reformCodes && (
              <p className="mt-1.5 text-xs text-rose-700">{errors.reformCodes}</p>
            )}

            {/* Selected codes list */}
            {values.reformCodes.length > 0 && (
              <div className="mt-3 border border-slate-200 rounded-md divide-y divide-slate-200 bg-slate-50/50">
                {values.reformCodes.map((code) => {
                  const catalogEntry = REFORM_CODES_MAP[code];
                  return (
                    <div
                      key={code}
                      className="px-3 py-2 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          CR {code}
                        </span>
                        {catalogEntry && (
                          <>
                            <span className="mx-2 text-slate-400">·</span>
                            <span className="text-slate-600">{catalogEntry.title}</span>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeReformCode(code)}
                        aria-label={`Quitar código ${code}`}
                        className="p-1 text-slate-500 hover:text-rose-700 transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Expandable CR Catalog picker */}
            {showCatalogPicker && (
              <div className="mt-3 border border-slate-200 rounded-md bg-white overflow-hidden">
                <div className="p-2.5 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Filtrar catálogo por código o descripción (ej. suspensión, camper, 8.52)..."
                    className="w-full text-xs bg-transparent text-slate-900 focus:outline-none"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {filteredCatalog.map((item) => {
                    const isSelected = values.reformCodes.includes(item.code);
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() =>
                          isSelected
                            ? removeReformCode(item.code)
                            : addReformCode(item.code)
                        }
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-3 transition-colors ${
                          isSelected
                            ? 'bg-blue-50/70 text-blue-900'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-semibold tabular-nums mr-2">
                            {item.code}
                          </span>
                          <span>{item.title}</span>
                        </div>
                        <span className="text-[11px] font-medium shrink-0">
                          {isSelected ? 'Añadido' : 'Añadir'}
                        </span>
                      </button>
                    );
                  })}
                  {filteredCatalog.length === 0 && (
                    <p className="px-3 py-4 text-xs text-slate-500 text-center">
                      No hay coincidencias en el catálogo. Puedes escribir el código manualmente arriba.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Row 4: Reformas del vehículo */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="vehicleReforms"
                className="block text-xs font-medium text-slate-700"
              >
                Reformas del vehículo *
              </label>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {values.vehicleReforms.length} / {ORDER_VALIDATION.REFORMS_MAX}
              </span>
            </div>
            <textarea
              id="vehicleReforms"
              rows={4}
              value={values.vehicleReforms}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, vehicleReforms: e.target.value }));
                setErrors((prev) => ({ ...prev, vehicleReforms: undefined }));
              }}
              maxLength={ORDER_VALIDATION.REFORMS_MAX}
              placeholder="Describe detalladamente las reformas: suspensión, neumáticos, mobiliario camper, enganche, alumbrado, referencias técnicas..."
              className="w-full p-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15 leading-relaxed"
            />
            {errors.vehicleReforms && (
              <p className="mt-1 text-xs text-rose-700">{errors.vehicleReforms}</p>
            )}
          </div>

          {/* Row 5: Cliente y contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="clientName"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Cliente *
              </label>
              <input
                id="clientName"
                type="text"
                value={values.clientName}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, clientName: e.target.value }));
                  setErrors((prev) => ({ ...prev, clientName: undefined }));
                }}
                placeholder="Nombre completo o taller solicitante"
                maxLength={ORDER_VALIDATION.CLIENT_NAME_MAX}
                className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              />
              {errors.clientName && (
                <p className="mt-1 text-xs text-rose-700">{errors.clientName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="clientContact"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Email o teléfono del cliente (opcional)
              </label>
              <input
                id="clientContact"
                type="text"
                value={values.clientContact}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, clientContact: e.target.value }));
                  setErrors((prev) => ({ ...prev, clientContact: undefined }));
                }}
                placeholder="cliente@correo.es · 600 000 000"
                maxLength={ORDER_VALIDATION.CLIENT_CONTACT_MAX}
                className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              />
              {errors.clientContact && (
                <p className="mt-1 text-xs text-rose-700">{errors.clientContact}</p>
              )}
            </div>
          </div>

          {/* Row 6: Observaciones internas */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="notes"
                className="block text-xs font-medium text-slate-700"
              >
                Observaciones internas (opcional)
              </label>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {values.notes.length} / {ORDER_VALIDATION.NOTES_MAX}
              </span>
            </div>
            <textarea
              id="notes"
              rows={2}
              value={values.notes}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, notes: e.target.value }));
                setErrors((prev) => ({ ...prev, notes: undefined }));
              }}
              maxLength={ORDER_VALIDATION.NOTES_MAX}
              placeholder="Documentación pendiente, citas ITV o notas de seguimiento..."
              className="w-full p-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            />
            {errors.notes && (
              <p className="mt-1 text-xs text-rose-700">{errors.notes}</p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 whitespace-nowrap"
            >
              {saving
                ? 'Guardando...'
                : editingOrder
                  ? 'Guardar cambios'
                  : 'Guardar pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
