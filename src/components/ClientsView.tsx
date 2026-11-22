import { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { formatCurrencyEur, type Order } from '../types/order';

interface ClientsViewProps {
  orders: Order[];
  onFilterByClient: (clientName: string) => void;
  onCreateOrder: () => void;
}

interface ClientSummary {
  name: string;
  contact: string;
  totalOrders: number;
  totalFinal: number;
  totalProfit: number;
  plates: string[];
  brands: string[];
  lastOrderDate: string;
}

export function ClientsView({
  orders,
  onFilterByClient,
  onCreateOrder,
}: ClientsViewProps) {
  const [search, setSearch] = useState('');

  const clients = useMemo<ClientSummary[]>(() => {
    const map = new Map<string, ClientSummary>();

    for (const order of orders) {
      const key = order.clientName.trim().toLowerCase();
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          name: order.clientName.trim(),
          contact: order.clientContact?.trim() ?? '',
          totalOrders: 1,
          totalFinal: order.finalPrice,
          totalProfit: order.profit,
          plates: [order.licensePlate],
          brands: [order.vehicleBrand],
          lastOrderDate: order.orderDate,
        });
      } else {
        existing.totalOrders += 1;
        existing.totalFinal = Math.round((existing.totalFinal + order.finalPrice) * 100) / 100;
        existing.totalProfit = Math.round((existing.totalProfit + order.profit) * 100) / 100;
        if (!existing.contact && order.clientContact?.trim()) {
          existing.contact = order.clientContact.trim();
        }
        if (!existing.plates.includes(order.licensePlate)) {
          existing.plates.push(order.licensePlate);
        }
        if (!existing.brands.includes(order.vehicleBrand)) {
          existing.brands.push(order.vehicleBrand);
        }
        if (order.orderDate > existing.lastOrderDate) {
          existing.lastOrderDate = order.orderDate;
        }
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      b.lastOrderDate.localeCompare(a.lastOrderDate)
    );
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) ||
        c.plates.some((p) => p.toLowerCase().includes(q)) ||
        c.brands.some((b) => b.toLowerCase().includes(q))
    );
  }, [clients, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Directorio de Clientes
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Resumen automático de particulares y talleres con facturación y ganancia acumulada.
          </p>
        </div>
        <div className="text-xs font-mono tabular-nums text-slate-500">
          {filtered.length} {filtered.length === 1 ? 'cliente' : 'clientes'}
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Aún no hay clientes registrados
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Los clientes aparecen aquí automáticamente a medida que registras pedidos de reformas.
          </p>
          <button
            type="button"
            onClick={onCreateOrder}
            className="mt-6 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap"
          >
            Registrar primer pedido
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <div className="relative max-w-md">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente, contacto o matrícula..."
                className="w-full h-9 pl-9 pr-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4 font-medium">Cliente</th>
                  <th className="py-3 px-4 font-medium">Vehículos / Matrículas</th>
                  <th className="py-3 px-4 font-medium text-right">Pedidos</th>
                  <th className="py-3 px-4 font-medium text-right">Precio final</th>
                  <th className="py-3 px-4 font-medium text-right">Ganancia</th>
                  <th className="py-3 px-4 font-medium">Último pedido</th>
                  <th className="py-3 px-4 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filtered.map((client) => (
                  <tr key={client.name} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 align-top">
                      <p className="font-medium text-slate-900">{client.name}</p>
                      {client.contact && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {client.contact}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <p className="font-mono text-xs text-slate-800 tabular-nums">
                        {client.plates.join(' · ')}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {client.brands.join(' · ')}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-slate-900 align-top">
                      {client.totalOrders}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-slate-900 whitespace-nowrap align-top">
                      {formatCurrencyEur(client.totalFinal)}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono text-xs font-semibold tabular-nums whitespace-nowrap align-top ${
                        client.totalProfit > 0
                          ? 'text-emerald-700'
                          : client.totalProfit < 0
                            ? 'text-rose-700'
                            : 'text-slate-600'
                      }`}
                    >
                      {client.totalProfit > 0 ? '+' : ''}
                      {formatCurrencyEur(client.totalProfit)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap align-top">
                      {client.lastOrderDate}
                    </td>
                    <td className="py-3.5 px-4 text-right align-top">
                      <button
                        type="button"
                        onClick={() => onFilterByClient(client.name)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md transition-colors whitespace-nowrap"
                      >
                        <span>Ver pedidos</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 px-4 text-center text-sm text-slate-500">
                      Ningún cliente coincide con tu búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
