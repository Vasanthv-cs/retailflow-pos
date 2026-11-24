import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  IndianRupee,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/src/components/ui/Button';
import { ProductThumbnail } from '@/src/components/ui/ProductThumbnail';
import { ReceiptModal } from '@/src/components/ui/ReceiptModal';
import { usePOS } from '@/src/hooks/usePOS';
import { formatDateTime, formatINR, isSameDay, round2 } from '@/src/utils/format';
import type { Sale } from '@/src/types/pos';

type ChartPeriod = 'daily' | 'weekly' | 'monthly';

const PAYMENT_COLORS: Record<string, string> = {
  UPI: '#4f46e5',
  Cash: '#0f766e',
  Card: '#d97706',
};

export function DashboardPage() {
  const { sales, products, categories, lowStockProducts, setActiveRoute } = usePOS();
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('weekly');

  const today = useMemo(() => new Date(), []);

  const analytics = useMemo(() => {
    const validSales = sales.filter((s) => s.status !== 'Returned');
    const todaySales = validSales.filter((s) => isSameDay(s.date, today));

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdaySales = validSales.filter((s) => isSameDay(s.date, yesterday));

    const todayRevenue = round2(todaySales.reduce((acc, s) => acc + s.totalAmount, 0));
    const yesterdayRevenue = round2(
      yesterdaySales.reduce((acc, s) => acc + s.totalAmount, 0)
    );
    const revDeltaAmt = round2(todayRevenue - yesterdayRevenue);
    const revDeltaPct =
      yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;

    // Period-filtered sales matching active chart selector
    const periodSales = validSales.filter((s) => {
      const diffMs = today.getTime() - new Date(s.date).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (chartPeriod === 'daily') return isSameDay(s.date, today);
      if (chartPeriod === 'weekly') return diffDays <= 7;
      return diffDays <= 30;
    });

    const totalSalesValue = round2(periodSales.reduce((acc, s) => acc + s.totalAmount, 0));
    const totalTxCount = periodSales.length;
    const avgTxValue = totalTxCount > 0 ? round2(totalSalesValue / totalTxCount) : 0;
    const estGrossProfit = round2(periodSales.reduce((acc, s) => acc + s.estimatedProfit, 0));
    const marginPct = totalSalesValue > 0 ? (estGrossProfit / totalSalesValue) * 100 : 0;

    return {
      todayRevenue,
      todayTxCount: todaySales.length,
      yesterdayRevenue,
      revDeltaAmt,
      revDeltaPct,
      totalSalesValue,
      totalTxCount,
      avgTxValue,
      estGrossProfit,
      marginPct,
      periodSales,
    };
  }, [sales, today, chartPeriod]);

  // Daily (hourly today), Weekly (last 7 days), Monthly (4 weekly buckets across last 30 days)
  const chartData = useMemo(() => {
    const validSales = sales.filter((s) => s.status !== 'Returned');

    if (chartPeriod === 'daily') {
      const buckets: Record<string, { label: string; revenue: number; profit: number }> = {};
      for (let h = 8; h <= 22; h += 2) {
        const key = `${h.toString().padStart(2, '0')}:00`;
        buckets[key] = { label: key, revenue: 0, profit: 0 };
      }
      validSales
        .filter((s) => isSameDay(s.date, today))
        .forEach((s) => {
          const hr = new Date(s.date).getHours();
          const snapped = Math.min(22, Math.max(8, Math.floor(hr / 2) * 2));
          const key = `${snapped.toString().padStart(2, '0')}:00`;
          if (buckets[key]) {
            buckets[key].revenue = round2(buckets[key].revenue + s.totalAmount);
            buckets[key].profit = round2(buckets[key].profit + s.estimatedProfit);
          }
        });
      return Object.values(buckets);
    }

    if (chartPeriod === 'weekly') {
      const days: { label: string; revenue: number; profit: number; dateObj: Date }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const label = new Intl.DateTimeFormat('en-IN', {
          day: '2-digit',
          month: 'short',
        }).format(d);
        days.push({ label, revenue: 0, profit: 0, dateObj: d });
      }
      validSales.forEach((s) => {
        const match = days.find((d) => isSameDay(s.date, d.dateObj));
        if (match) {
          match.revenue = round2(match.revenue + s.totalAmount);
          match.profit = round2(match.profit + s.estimatedProfit);
        }
      });
      return days.map(({ label, revenue, profit }) => ({ label, revenue, profit }));
    }

    // Monthly: 4 rolling 7-day / 8-day weeks over last 30 days
    const weeks = [
      { label: 'Week 1 (22-30d ago)', min: 22, max: 30, revenue: 0, profit: 0 },
      { label: 'Week 2 (15-21d ago)', min: 15, max: 21, revenue: 0, profit: 0 },
      { label: 'Week 3 (8-14d ago)', min: 8, max: 14, revenue: 0, profit: 0 },
      { label: 'This Week (0-7d)', min: 0, max: 7, revenue: 0, profit: 0 },
    ];
    validSales.forEach((s) => {
      const diffDays = Math.floor(
        (today.getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24)
      );
      const bucket = weeks.find((w) => diffDays >= w.min && diffDays <= w.max);
      if (bucket) {
        bucket.revenue = round2(bucket.revenue + s.totalAmount);
        bucket.profit = round2(bucket.profit + s.estimatedProfit);
      }
    });
    return weeks.map(({ label, revenue, profit }) => ({ label, revenue, profit }));
  }, [sales, chartPeriod, today]);

  const paymentDistribution = useMemo(() => {
    const map: Record<string, { name: string; amount: number; count: number }> = {
      UPI: { name: 'UPI', amount: 0, count: 0 },
      Cash: { name: 'Cash', amount: 0, count: 0 },
      Card: { name: 'Card', amount: 0, count: 0 },
    };
    analytics.periodSales.forEach((s) => {
      const entry = map[s.paymentMethod];
      if (entry) {
        entry.amount = round2(entry.amount + s.totalAmount);
        entry.count += 1;
      }
    });
    const totalAmt = Object.values(map).reduce((sum, e) => sum + e.amount, 0);
    return Object.values(map).map((e) => ({
      ...e,
      share: totalAmt > 0 ? (e.amount / totalAmt) * 100 : 0,
    }));
  }, [analytics.periodSales]);

  const topFiveProducts = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        name: string;
        sku: string;
        categoryId?: string;
        imageUrl?: string;
        categoryName: string;
        unitsSold: number;
        revenue: number;
      }
    >();

    analytics.periodSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = map.get(item.productId);
        if (existing) {
          existing.unitsSold += item.quantity;
          existing.revenue = round2(existing.revenue + item.lineTotal);
        } else {
          const prod = products.find((p) => p.id === item.productId);
          const catName =
            categories.find((c) => c.id === prod?.categoryId)?.name ?? 'General';
          map.set(item.productId, {
            productId: item.productId,
            name: item.productName,
            sku: item.sku,
            categoryId: prod?.categoryId,
            imageUrl: prod?.imageUrl,
            categoryName: catName,
            unitsSold: item.quantity,
            revenue: item.lineTotal,
          });
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [analytics.periodSales, products, categories]);

  const recentSales = useMemo(() => sales.slice(0, 6), [sales]);

  const periodLabel =
    chartPeriod === 'daily'
      ? 'Today'
      : chartPeriod === 'weekly'
      ? 'Last 7 Days'
      : 'Last 30 Days';

  return (
    <div className="space-y-6">
      {/* Header Row with Period Filter & POS Action */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Business Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Live INR revenue, margin performance, payment mix, and low-stock alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200/80 bg-slate-100/80 p-0.5">
            {(
              [
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setChartPeriod(opt.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  chartPeriod === opt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button onClick={() => setActiveRoute('pos')}>
            <ShoppingCart className="h-4 w-4" />
            Open POS Terminal
          </Button>
        </div>
      </div>

      {/* 5-KPI Metric Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* Today's Revenue + Previous Day Comparison */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300/80 transition-colors">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Today&apos;s Revenue</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2.5 text-2xl font-semibold tracking-tight text-slate-900 font-mono tabular-nums">
            {formatINR(analytics.todayRevenue)}
          </p>
          <div className="mt-1.5 flex items-center gap-1 text-xs tabular-nums">
            {analytics.revDeltaPct >= 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 text-red-600 shrink-0" />
            )}
            <span
              className={
                analytics.revDeltaPct >= 0
                  ? 'font-medium text-emerald-700'
                  : 'font-medium text-red-600'
              }
            >
              {analytics.revDeltaPct >= 0 ? '+' : ''}
              {analytics.revDeltaPct.toFixed(1)}%
            </span>
            <span className="text-slate-500 truncate">
              vs yesterday ({formatINR(analytics.yesterdayRevenue, false)})
            </span>
          </div>
        </div>

        {/* Total Sales (Selected Period) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300/80 transition-colors">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Sales ({periodLabel})</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <ShoppingBag className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2.5 text-2xl font-semibold tracking-tight text-slate-900 font-mono tabular-nums">
            {formatINR(analytics.totalSalesValue)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Gross billed incl. GST
          </p>
        </div>

        {/* Number of Transactions */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300/80 transition-colors">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Transactions ({periodLabel})</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Receipt className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2.5 text-2xl font-semibold tracking-tight text-slate-900 font-mono tabular-nums">
            {analytics.totalTxCount}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {analytics.todayTxCount} billed today
          </p>
        </div>

        {/* Average Transaction Value */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300/80 transition-colors">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Avg. Transaction Value</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <ShoppingCart className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2.5 text-2xl font-semibold tracking-tight text-slate-900 font-mono tabular-nums">
            {formatINR(analytics.avgTxValue)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            Mean basket ({periodLabel.toLowerCase()})
          </p>
        </div>

        {/* Estimated Gross Profit */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300/80 transition-colors">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Est. Gross Profit</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2.5 text-2xl font-semibold tracking-tight text-emerald-700 font-mono tabular-nums">
            {formatINR(analytics.estGrossProfit)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {analytics.marginPct.toFixed(1)}% estimated margin
          </p>
        </div>
      </div>

      {/* Charts Row: Revenue & Profit Trend + Payment Method Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Sales &amp; Profit Performance ({periodLabel})
              </h2>
              <p className="text-xs text-slate-500">
                Calculated dynamically from store invoices (INR)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-indigo-600" />
                Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600" />
                Est. Gross Profit
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v}`}
                  width={64}
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [
                    formatINR(Number(value ?? 0)),
                    name === 'revenue' ? 'Sales Revenue' : 'Est. Gross Profit',
                  ]}
                  contentStyle={{
                    borderRadius: 8,
                    borderColor: '#e2e8f0',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="url(#dashRevGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Method Distribution */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Payment Method Distribution
            </h2>
            <p className="text-xs text-slate-500">
              Share by tender mode ({periodLabel.toLowerCase()})
            </p>
          </div>

          <div className="h-48 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentDistribution}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={74}
                  paddingAngle={2}
                >
                  {paymentDistribution.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={PAYMENT_COLORS[entry.name] ?? '#64748b'}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(val: unknown) => formatINR(Number(val ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-auto space-y-2.5 border-t border-slate-100 pt-3 text-xs tabular-nums">
            {paymentDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: PAYMENT_COLORS[item.name] }}
                  />
                  <span className="font-medium text-slate-800">{item.name}</span>
                  <span className="text-slate-400">· {item.count} tx</span>
                </div>
                <div className="text-right font-mono shrink-0">
                  <span className="font-semibold text-slate-900">
                    {formatINR(item.amount)}
                  </span>
                  <span className="ml-1.5 text-slate-400">{item.share.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Row: Top 5 Selling Products + Low-Stock Product Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Top 5 Selling Products
              </h2>
              <p className="text-xs text-slate-500">Ranked by billed revenue ({periodLabel})</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveRoute('products')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              View Catalog
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Units Sold</th>
                  <th className="px-5 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topFiveProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-xs text-slate-500">
                      No product sales recorded in this period.
                    </td>
                  </tr>
                ) : (
                  topFiveProducts.map((p, i) => (
                    <tr key={p.productId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs font-medium text-slate-400 w-5 shrink-0">
                            0{i + 1}
                          </span>
                          <ProductThumbnail
                            src={p.imageUrl}
                            alt={p.name}
                            categoryId={p.categoryId}
                            sku={p.sku}
                            size="xs"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{p.name}</p>
                            <p className="font-mono text-xs text-slate-400">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{p.categoryName}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {p.unitsSold}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatINR(p.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low-Stock Product Alerts */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200/80 bg-white shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Low-Stock Alerts ({lowStockProducts.length})
                </h2>
                <p className="text-xs text-slate-500">Active SKUs at or below min threshold</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveRoute('inventory')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer whitespace-nowrap"
            >
              Manage Stock
            </button>
          </div>
          <div className="flex-1 divide-y divide-slate-100">
            {lowStockProducts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                All active products are well above minimum stock levels.
              </div>
            ) : (
              lowStockProducts.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ProductThumbnail
                      src={item.imageUrl}
                      alt={item.name}
                      categoryId={item.categoryId}
                      sku={item.sku}
                      size="xs"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500 font-mono">
                        {item.sku} · Min {item.lowStockThreshold} {item.unit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`font-mono text-xs font-semibold tabular-nums ${
                        item.stock === 0 ? 'text-red-600' : 'text-amber-700'
                      }`}
                    >
                      {item.stock} left
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveRoute('purchases')}
                      className="text-[11px] font-medium text-indigo-600 hover:underline cursor-pointer"
                    >
                      Create PO
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Full-Width Recent Sales Table */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Sales</h2>
            <p className="text-xs text-slate-500">Latest counter invoices across all cashiers</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveRoute('sales')}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            All Invoices
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Invoice</th>
                <th className="px-4 py-3">Date &amp; Time</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Cashier</th>
                <th className="px-4 py-3">Payment · Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-900">
                    {sale.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                    {formatDateTime(sale.date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-800">{sale.customerName}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{sale.cashierName}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <span>{sale.paymentMethod}</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span
                      className={
                        sale.status === 'Completed'
                          ? 'font-medium text-emerald-700'
                          : 'font-medium text-amber-700'
                      }
                    >
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                    {formatINR(sale.totalAmount)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setReceiptSale(sale)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Preview
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ReceiptModal sale={receiptSale} onClose={() => setReceiptSale(null)} />
    </div>
  );
}
