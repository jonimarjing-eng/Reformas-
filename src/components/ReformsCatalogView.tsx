import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { REFORM_CODES_CATALOG } from '../data/reformsCatalog';
import type { Order } from '../types/order';

interface ReformsCatalogViewProps {
  orders: Order[];
  onCreateWithCode: (code: string) => void;
}

export function ReformsCatalogView({
  orders,
  onCreateWithCode,
}: ReformsCatalogViewProps) {
  const [search, setSearch] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');

  const sections = useMemo(() => {
    const unique = Array.from(new Set(REFORM_CODES_CATALOG.map((c) => c.section)));
    return unique;
  }, []);

  const usageCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const order of orders) {
      for (const code of order.reformCodes) {
        counts[code] = (counts[code] ?? 0) + 1;
      }
    }
    return counts;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return REFORM_CODES_CATALOG.filter((entry) => {
      if (selectedSection !== 'all' && entry.section !== selectedSection) {
        return false;
      }
      if (!q) return true;
      return (
        entry.code.toLowerCase().includes(q) ||
        entry.title.toLowerCase().includes(q) ||
        entry.summary.toLowerCase().includes(q) ||
        entry.section.toLowerCase().includes(q)
      );
    });
  }, [search, selectedSection]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Catálogo de Códigos de Reforma
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Referencia rápida del Manual de Reformas de Vehículos (RD 866/2010) con uso en tus expedientes.
          </p>
        </div>
        <div className="text-xs font-mono tabular-nums text-slate-500">
          {filtered.length} de {REFORM_CODES_CATALOG.length} códigos
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código (ej. 5.1, 8.20), grupo o descripción..."
              className="w-full h-9 pl-9 pr-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <select
            aria-label="Filtrar por grupo de reforma"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="h-9 px-3 text-sm text-slate-700 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
          >
            <option value="all">Todos los grupos</option>
            {sections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-3 px-4 font-medium w-24">Código</th>
                <th className="py-3 px-4 font-medium w-44">Grupo</th>
                <th className="py-3 px-4 font-medium">Descripción técnica</th>
                <th className="py-3 px-4 font-medium text-right w-28">En pedidos</th>
                <th className="py-3 px-4 font-medium text-right w-40">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filtered.map((item) => {
                const count = usageCountMap[item.code] ?? 0;
                return (
                  <tr key={item.code} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap align-top">
                      CR {item.code}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap align-top">
                      {item.section}
                    </td>
                    <td className="py-3.5 px-4 align-top">
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                        {item.summary}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-slate-600 align-top">
                      {count}
                    </td>
                    <td className="py-3.5 px-4 text-right align-top">
                      <button
                        type="button"
                        onClick={() => onCreateWithCode(item.code)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md transition-colors whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Usar en pedido</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 px-4 text-center text-sm text-slate-500">
                    No se encontraron códigos de reforma que coincidan con tu búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
