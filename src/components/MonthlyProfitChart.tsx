import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrencyEur, type Order } from '../types/order';

interface MonthlyProfitChartProps {
  orders: Order[];
  loading: boolean;
  selectedMonth: string | null; // YYYY-MM
  onSelectMonth: (monthKey: string | null) => void;
}

interface MonthDatum {
  monthKey: string; // YYYY-MM
  shortLabel: string;
  fullLabel: string;
  profit: number;
  finalPrice: number;
  labPrice: number;
  count: number;
}

const MONTH_SHORT_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const MONTH_FULL_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function formatCompactEur(value: number): string {
  if (Math.abs(value) >= 1000) {
    const k = value / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k €`;
  }
  return `${value} €`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthDatum }>;
}

function ProfitTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;

  return (
    <div className="bg-white border border-slate-200 rounded-md px-3.5 py-2.5 shadow-sm text-xs min-w-[200px]">
      <div className="flex items-center justify-between gap-4 pb-1.5 border-b border-slate-100">
        <span className="font-semibold text-slate-900">{item.fullLabel}</span>
        <span className="font-mono tabular-nums text-slate-500">
          {item.count} {item.count === 1 ? 'pedido' : 'pedidos'}
        </span>
      </div>
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Precio final</span>
          <span className="font-mono tabular-nums text-slate-900">
            {formatCurrencyEur(item.finalPrice)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Precio lab.</span>
          <span className="font-mono tabular-nums text-slate-600">
            {formatCurrencyEur(item.labPrice)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100">
          <span className="font-medium text-slate-700">Ganancia</span>
          <span
            className={`font-mono font-semibold tabular-nums ${
              item.profit > 0
                ? 'text-emerald-700'
                : item.profit < 0
                  ? 'text-rose-700'
                  : 'text-slate-700'
            }`}
          >
            {item.profit > 0 ? '+' : ''}
            {formatCurrencyEur(item.profit)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function MonthlyProfitChart({
  orders,
  loading,
  selectedMonth,
  onSelectMonth,
}: MonthlyProfitChartProps) {
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const order of orders) {
      const year = order.orderDate.slice(0, 4);
      if (/^\d{4}$/.test(year)) {
        years.add(year);
      }
    }
    const sorted = Array.from(years).sort((a, b) => b.localeCompare(a));
    if (sorted.length === 0) {
      sorted.push(String(new Date().getFullYear()));
    }
    return sorted;
  }, [orders]);

  const [selectedYear, setSelectedYear] = useState<string>(
    () => availableYears[0]
  );

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const monthlyData = useMemo<MonthDatum[]>(() => {
    const buckets: MonthDatum[] = Array.from({ length: 12 }, (_, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      return {
        monthKey: `${selectedYear}-${monthNum}`,
        shortLabel: MONTH_SHORT_LABELS[idx],
        fullLabel: `${MONTH_FULL_LABELS[idx]} ${selectedYear}`,
        profit: 0,
        finalPrice: 0,
        labPrice: 0,
        count: 0,
      };
    });

    for (const order of orders) {
      if (!order.orderDate.startsWith(`${selectedYear}-`)) continue;
      const monthIndex = Number(order.orderDate.slice(5, 7)) - 1;
      if (monthIndex < 0 || monthIndex > 11) continue;
      const bucket = buckets[monthIndex];
      bucket.profit = Math.round((bucket.profit + order.profit) * 100) / 100;
      bucket.finalPrice =
        Math.round((bucket.finalPrice + order.finalPrice) * 100) / 100;
      bucket.labPrice =
        Math.round((bucket.labPrice + order.labPrice) * 100) / 100;
      bucket.count += 1;
    }

    return buckets;
  }, [orders, selectedYear]);

  const yearTotals = useMemo(() => {
    let profit = 0;
    let count = 0;
    for (const m of monthlyData) {
      profit += m.profit;
      count += m.count;
    }
    return {
      profit: Math.round(profit * 100) / 100,
      count,
    };
  }, [monthlyData]);

  const handleBarClick = (data: MonthDatum) => {
    if (data.count === 0 && selectedMonth !== data.monthKey) return;
    if (selectedMonth === data.monthKey) {
      onSelectMonth(null);
    } else {
      onSelectMonth(data.monthKey);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="mt-5 h-[220px] w-full bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <section
      aria-label="Gráfico de ganancia mensual"
      className="bg-white border border-slate-200 rounded-lg p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Ganancia mensual por fecha de creación
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            <span>Año {selectedYear}</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className="font-mono tabular-nums">
              {yearTotals.count}{' '}
              {yearTotals.count === 1 ? 'pedido' : 'pedidos'}
            </span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>
              Acumulado:{' '}
              <span
                className={`font-mono font-medium tabular-nums ${
                  yearTotals.profit < 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {yearTotals.profit > 0 ? '+' : ''}
                {formatCurrencyEur(yearTotals.profit)}
              </span>
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {selectedMonth && (
            <button
              type="button"
              onClick={() => onSelectMonth(null)}
              className="px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md transition-colors whitespace-nowrap"
            >
              Mostrar todo el año
            </button>
          )}

          {availableYears.length > 1 ? (
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              {availableYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => {
                    setSelectedYear(year);
                    if (selectedMonth && !selectedMonth.startsWith(`${year}-`)) {
                      onSelectMonth(null);
                    }
                  }}
                  className={`px-2.5 py-1 text-xs font-mono font-medium tabular-nums rounded transition-colors whitespace-nowrap ${
                    selectedYear === year
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-xs text-slate-400 hidden sm:inline">
              Pulsa una barra para filtrar el mes
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 w-full h-[230px] min-w-0">
        {yearTotals.count === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            No hay pedidos registrados en {selectedYear} para los filtros actuales.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{ top: 10, right: 8, left: 4, bottom: 0 }}
              barCategoryGap="24%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E2E8F0"
              />
              <XAxis
                dataKey="shortLabel"
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 12 }}
                dy={6}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCompactEur}
                tick={{
                  fill: '#64748B',
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
                width={64}
              />
              <ReferenceLine y={0} stroke="#CBD5E1" />
              <Tooltip
                cursor={{ fill: '#F1F5F9', opacity: 0.7 }}
                content={<ProfitTooltip />}
              />
              <Bar
                dataKey="profit"
                radius={[4, 4, 0, 0]}
                maxBarSize={42}
                onClick={(_, index) => {
                  const target = monthlyData[index];
                  if (target) handleBarClick(target);
                }}
                className="cursor-pointer"
              >
                {monthlyData.map((entry) => {
                  const isSelected = selectedMonth === entry.monthKey;
                  const isDimmed =
                    selectedMonth !== null && selectedMonth !== entry.monthKey;
                  let fill = '#047857';
                  if (entry.profit < 0) {
                    fill = '#BE123C';
                  } else if (isSelected) {
                    fill = '#1D4ED8';
                  }
                  return (
                    <Cell
                      key={entry.monthKey}
                      fill={fill}
                      fillOpacity={isDimmed ? 0.3 : 1}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
