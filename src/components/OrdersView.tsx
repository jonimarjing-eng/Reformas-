import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Lock,
  Mail,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { ORDER_STATUS_LIST, ORDER_STATUS_MAP } from '../data/reformsCatalog';
import {
  formatCurrencyEur,
  isTerminalStatus,
  type Order,
  type OrderStatus,
} from '../types/order';
import { MonthlyProfitChart } from './MonthlyProfitChart';

type SortOption =
  | 'date_desc'
  | 'date_asc'
  | 'plate_asc'
  | 'client_asc'
  | 'profit_desc';

interface OrdersViewProps {
  orders: Order[];
  loading: boolean;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSelectOrder: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onEmailClient: (order: Order) => void;
  onQuickStatusChange: (order: Order, status: OrderStatus) => Promise<void>;
  onCreateOrder: () => void;
  onSeedSamples: () => Promise<void>;
  seeding: boolean;
}

function formatDateEs(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function OrdersView({
  orders,
  loading,
  searchQuery,
  onSearchQueryChange,
  onSelectOrder,
  onEditOrder,
  onEmailClient,
  onQuickStatusChange,
  onCreateOrder,
  onSeedSamples,
  seeding,
}: OrdersViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    for (const st of ORDER_STATUS_LIST) {
      counts[st.value] = 0;
    }
    for (const order of orders) {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
    }
    return counts;
  }, [orders]);

  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    for (const order of orders) {
      if (order.vehicleBrand.trim()) {
        set.add(order.vehicleBrand.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [orders]);

  const chartOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }
      if (brandFilter !== 'all' && order.vehicleBrand !== brandFilter) {
        return false;
      }
      if (!q) return true;

      return (
        order.licensePlate.toLowerCase().includes(q) ||
        order.clientName.toLowerCase().includes(q) ||
        order.vehicleBrand.toLowerCase().includes(q) ||
        (order.vehicleModel ?? '').toLowerCase().includes(q) ||
        order.vehicleReforms.toLowerCase().includes(q) ||
        order.orderDate.includes(q) ||
        order.reformCodes.some((code) => code.toLowerCase().includes(q))
      );
    });
  }, [orders, statusFilter, brandFilter, searchQuery]);

  const filteredOrders = useMemo(() => {
    const list = selectedMonth
      ? chartOrders.filter((order) => order.orderDate.startsWith(selectedMonth))
      : chartOrders;

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return a.orderDate.localeCompare(b.orderDate);
        case 'plate_asc':
          return a.licensePlate.localeCompare(b.licensePlate, 'es');
        case 'client_asc':
          return a.clientName.localeCompare(b.clientName, 'es');
        case 'profit_desc':
          return b.profit - a.profit;
        case 'date_desc':
        default: {
          const d = b.orderDate.localeCompare(a.orderDate);
          if (d !== 0) return d;
          return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
        }
      }
    });

    return sorted;
  }, [chartOrders, selectedMonth, sortBy]);

  const metrics = useMemo(() => {
    let totalLab = 0;
    let totalFinal = 0;
    let totalProfit = 0;

    for (const order of filteredOrders) {
      totalLab += order.labPrice;
      totalFinal += order.finalPrice;
      totalProfit += order.profit;
    }

    return {
      count: filteredOrders.length,
      totalLab: Math.round(totalLab * 100) / 100,
      totalFinal: Math.round(totalFinal * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
    };
  }, [filteredOrders]);

  const hasActiveFilters =
    statusFilter !== 'all' ||
    brandFilter !== 'all' ||
    selectedMonth !== null ||
    searchQuery.trim().length > 0;

  const clearFilters = () => {
    setStatusFilter('all');
    setBrandFilter('all');
    setSelectedMonth(null);
    onSearchQueryChange('');
  };

  const handleInlineStatus = async (order: Order, nextStatus: OrderStatus) => {
    setUpdatingOrderId(order.id);
    try {
      await onQuickStatusChange(order, nextStatus);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Registro de Pedidos
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Control de expedientes de reformas, estados, códigos CR e importes económicos.
          </p>
        </div>
        {!loading && orders.length > 0 && (
          <p className="text-xs font-mono tabular-nums text-slate-500">
            Mostrando {filteredOrders.length} de {orders.length} pedidos
          </p>
        )}
      </div>

      {/* Flat Hairline-Divided Financial & Volume Summary Strip */}
      <div className="bg-white border border-slate-200 rounded-lg grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500">
            {hasActiveFilters ? 'Pedidos filtrados' : 'Total pedidos'}
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {loading ? '—' : metrics.count}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Precio laboratorio</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {loading ? '—' : formatCurrencyEur(metrics.totalLab)}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Precio final</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-blue-700 tabular-nums">
            {loading ? '—' : formatCurrencyEur(metrics.totalFinal)}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Ganancia total</p>
          <p
            className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${
              loading
                ? 'text-slate-900'
                : metrics.totalProfit < 0
                  ? 'text-rose-700'
                  : 'text-emerald-700'
            }`}
          >
            {loading
              ? '—'
              : `${metrics.totalProfit > 0 ? '+' : ''}${formatCurrencyEur(metrics.totalProfit)}`}
          </p>
        </div>
      </div>

      {/* Monthly Profit Bar Chart (Recharts) */}
      {(loading || orders.length > 0) && (
        <MonthlyProfitChart
          orders={chartOrders}
          loading={loading}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
        />
      )}

      {/* Main Data Grid Surface */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {/* Toolbar: Search, Brand Filter, Sort */}
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Buscar por matrícula, cliente, marca, código CR o reforma..."
                className="w-full h-9 pl-9 pr-8 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchQueryChange('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
              <select
                aria-label="Filtrar por marca"
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="h-9 px-3 text-sm text-slate-700 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 min-w-[155px]"
              >
                <option value="all">Todas las marcas</option>
                {availableBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>

              <div className="relative flex items-center">
                <ArrowUpDown
                  className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none"
                  aria-hidden="true"
                />
                <select
                  aria-label="Ordenar pedidos"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="h-9 pl-8 pr-3 text-sm text-slate-700 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                >
                  <option value="date_desc">Más recientes</option>
                  <option value="date_asc">Más antiguos</option>
                  <option value="profit_desc">Mayor ganancia</option>
                  <option value="plate_asc">Matrícula (A–Z)</option>
                  <option value="client_asc">Cliente (A–Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Interactive Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({statusCounts.all ?? 0})
              </button>
              {ORDER_STATUS_LIST.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => setStatusFilter(st.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === st.value
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st.label} ({statusCounts[st.value] ?? 0})
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-2 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Loading Skeleton State */}
        {loading ? (
          <div className="divide-y divide-slate-200">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="px-4 py-3.5 grid grid-cols-12 gap-4 items-center animate-pulse"
              >
                <div className="col-span-2 h-4 bg-slate-200 rounded w-24" />
                <div className="col-span-1 h-4 bg-slate-100 rounded w-16" />
                <div className="col-span-2 h-4 bg-slate-100 rounded w-28" />
                <div className="col-span-2 h-4 bg-slate-100 rounded w-24" />
                <div className="col-span-3 h-4 bg-slate-100 rounded w-full" />
                <div className="col-span-2 h-4 bg-slate-100 rounded w-20" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-6 text-center">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Todavía no tienes pedidos registrados
            </h2>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Registra tu primer expediente indicando matrícula, fecha de creación, estado, marca, códigos CR, reformas, cliente y precios de laboratorio y venta final.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onCreateOrder}
                className="h-10 px-4 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Registrar primer pedido</span>
              </button>
              <button
                type="button"
                onClick={onSeedSamples}
                disabled={seeding}
                className="h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                {seeding ? 'Cargando ejemplos...' : 'Cargar 4 pedidos de ejemplo'}
              </button>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          /* No filter matches */
          <div className="py-14 px-6 text-center">
            <p className="text-sm font-medium text-slate-900">
              No se encontraron pedidos con los filtros seleccionados
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Prueba a cambiar el estado, la marca o el término de búsqueda.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 px-3.5 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          /* High-Density Populated Data Grid */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1260px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4 font-medium w-[112px]">Matrícula</th>
                  <th className="py-3 px-3 font-medium w-[96px]">Fecha</th>
                  <th className="py-3 px-3 font-medium w-[200px]">Estado</th>
                  <th className="py-3 px-3 font-medium w-[148px]">Marca / Vehículo</th>
                  <th className="py-3 px-3 font-medium w-[124px]">Códigos CR</th>
                  <th className="py-3 px-3 font-medium">Reformas</th>
                  <th className="py-3 px-3 font-medium w-[155px]">Cliente</th>
                  <th className="py-3 px-3 font-medium text-right w-[94px]">Lab.</th>
                  <th className="py-3 px-3 font-medium text-right w-[94px]">Final</th>
                  <th className="py-3 px-3 font-medium text-right w-[104px]">Ganancia</th>
                  <th className="py-3 px-4 font-medium text-right w-[92px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredOrders.map((order) => {
                  const stMeta = ORDER_STATUS_MAP[order.status];
                  const locked = isTerminalStatus(order.status);
                  const isBusy = updatingOrderId === order.id;

                  return (
                    <tr
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className="hover:bg-slate-50/90 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <span className="font-mono text-sm font-semibold tracking-wider text-slate-900 tabular-nums">
                          {order.licensePlate}
                        </span>
                      </td>

                      <td className="py-3 px-3 align-top whitespace-nowrap font-mono text-xs text-slate-600 tabular-nums">
                        {formatDateEs(order.orderDate)}
                      </td>

                      <td
                        className="py-3 px-3 align-top whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {locked ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium">
                            <span className={stMeta.textClass}>{stMeta.label}</span>
                            <Lock
                              className="w-3 h-3 text-slate-400"
                              aria-label="Expediente cerrado"
                            />
                          </div>
                        ) : (
                          <select
                            aria-label={`Estado del pedido ${order.licensePlate}`}
                            value={order.status}
                            disabled={isBusy}
                            onChange={(e) =>
                              handleInlineStatus(
                                order,
                                e.target.value as OrderStatus
                              )
                            }
                            className={`text-xs font-medium bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-700 focus:bg-white rounded px-1.5 py-1 -ml-1.5 cursor-pointer focus:outline-none disabled:opacity-50 max-w-[192px] ${stMeta.textClass}`}
                          >
                            {ORDER_STATUS_LIST.map((st) => (
                              <option
                                key={st.value}
                                value={st.value}
                                className="text-slate-900"
                              >
                                {st.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      <td className="py-3 px-3 align-top">
                        <p className="font-medium text-slate-900 leading-snug text-xs">
                          {order.vehicleBrand}
                        </p>
                        {order.vehicleModel && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[138px]">
                            {order.vehicleModel}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3 align-top font-mono text-xs text-slate-700 tabular-nums leading-relaxed">
                        {order.reformCodes.join(' · ')}
                      </td>

                      <td className="py-3 px-3 align-top">
                        <p className="text-xs text-slate-700 leading-relaxed line-clamp-2 max-w-[260px]">
                          {order.vehicleReforms}
                        </p>
                      </td>

                      <td className="py-3 px-3 align-top">
                        <p className="text-xs font-medium text-slate-900 truncate max-w-[145px]">
                          {order.clientName}
                        </p>
                        {order.clientContact && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[145px]">
                            {order.clientContact}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3 align-top text-right font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {formatCurrencyEur(order.labPrice)}
                      </td>

                      <td className="py-3 px-3 align-top text-right font-mono text-xs font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {formatCurrencyEur(order.finalPrice)}
                      </td>

                      <td
                        className={`py-3 px-3 align-top text-right font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
                          order.profit > 0
                            ? 'text-emerald-700'
                            : order.profit < 0
                              ? 'text-rose-700'
                              : 'text-slate-600'
                        }`}
                      >
                        {order.profit > 0 ? '+' : ''}
                        {formatCurrencyEur(order.profit)}
                      </td>

                      <td
                        className="py-3 px-4 align-top text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onEmailClient(order)}
                            aria-label={`Enviar correo de estado para ${order.licensePlate}`}
                            title="Enviar actualización por correo"
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          {locked ? (
                            <button
                              type="button"
                              onClick={() => onSelectOrder(order)}
                              className="text-xs font-medium text-slate-500 hover:text-slate-900 px-2 py-1 rounded transition-colors"
                            >
                              Ver
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onEditOrder(order)}
                              aria-label={`Editar pedido ${order.licensePlate}`}
                              title="Editar pedido"
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
