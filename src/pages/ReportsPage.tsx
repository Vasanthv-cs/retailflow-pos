import { useMemo } from 'react';
import { Download } from 'lucide-react';
import {
  Bar,
  BarChart,
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
import { usePOS } from '@/src/hooks/usePOS';
import { downloadCSV, formatINR, isSameDay, round2 } from '@/src/utils/format';

const PIE_COLORS = ['#4f46e5', '#0f766e', '#d97706'];

export function ReportsPage() {
  const { sales, products, categories, addToast } = usePOS();

  const summary = useMemo(() => {
    const active = sales.filter((s) => s.status !== 'Returned');
    const revenue = active.reduce((acc, s) => acc + s.totalAmount, 0);
    const taxable = active.reduce((acc, s) => acc + s.subtotal, 0);
    const gst = active.reduce((acc, s) => acc + s.taxAmount, 0);
    const profit = active.reduce((acc, s) => acc + s.estimatedProfit, 0);
    return { revenue, taxable, gst, profit, count: active.length };
  }, [sales]);

  const dailySeries = useMemo(() => {
    const today = new Date();
    const list: { label: string; revenue: number; profit: number; dateObj: Date }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      list.push({
        label: new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(d),
        revenue: 0,
        profit: 0,
        dateObj: d,
      });
    }
    sales.forEach((s) => {
      const slot = list.find((d) => isSameDay(s.date, d.dateObj));
      if (slot) {
        slot.revenue = round2(slot.revenue + s.totalAmount);
        slot.profit = round2(slot.profit + s.estimatedProfit);
      }
    });
    return list;
  }, [sales]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; units: number }>();
    categories.forEach((c) => map.set(c.id, { name: c.name, revenue: 0, units: 0 }));

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const catId = prod?.categoryId;
        if (catId && map.has(catId)) {
          const entry = map.get(catId)!;
          entry.revenue = round2(entry.revenue + item.lineTotal);
          entry.units += item.quantity;
        }
      });
    });

    return Array.from(map.values())
      .filter((c) => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [sales, products, categories]);

  const paymentSplit = useMemo(() => {
    const buckets: Record<string, number> = { UPI: 0, Cash: 0, Card: 0 };
    sales.forEach((s) => {
      buckets[s.paymentMethod] = round2((buckets[s.paymentMethod] ?? 0) + s.totalAmount);
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [sales]);

  const gstSlabTable = useMemo(() => {
    const slabs = new Map<number, { rate: number; taxable: number; cgst: number; sgst: number; totalTax: number }>();
    [0, 5, 12, 18, 28].forEach((r) =>
      slabs.set(r, { rate: r, taxable: 0, cgst: 0, sgst: 0, totalTax: 0 })
    );

    sales.forEach((s) => {
      s.items.forEach((item) => {
        const entry = slabs.get(item.gstRate) ?? {
          rate: item.gstRate,
          taxable: 0,
          cgst: 0,
          sgst: 0,
          totalTax: 0,
        };
        const base = item.lineTotal - item.taxAmount;
        entry.taxable = round2(entry.taxable + base);
        entry.totalTax = round2(entry.totalTax + item.taxAmount);
        entry.cgst = round2(entry.totalTax / 2);
        entry.sgst = round2(entry.totalTax - entry.cgst);
        slabs.set(item.gstRate, entry);
      });
    });

    return Array.from(slabs.values()).filter((s) => s.taxable > 0);
  }, [sales]);

  const handleExportCSV = () => {
    downloadCSV(
      `retailflow-sales-report-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Invoice', 'Date', 'Customer', 'Cashier', 'Payment Mode', 'Status', 'Taxable Value', 'GST', 'Grand Total'],
      sales.map((s) => [
        s.invoiceNumber,
        s.date,
        s.customerName,
        s.cashierName,
        s.paymentMethod,
        s.status,
        s.subtotal,
        s.taxAmount,
        s.totalAmount,
      ])
    );
    addToast('CSV report exported', 'success', 'Sales register downloaded.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Reports &amp; Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sales revenue, category mix, payment modes, and GST slab reconciliation.
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4" />
          Export Sales CSV
        </Button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Gross Sales</p>
          <p className="mt-2 text-2xl font-semibold font-mono text-slate-900 tabular-nums">
            {formatINR(summary.revenue)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{summary.count} active bills</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Net Taxable Sales</p>
          <p className="mt-2 text-2xl font-semibold font-mono text-slate-900 tabular-nums">
            {formatINR(summary.taxable)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Excluding CGST / SGST</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total GST Collected</p>
          <p className="mt-2 text-2xl font-semibold font-mono text-slate-900 tabular-nums">
            {formatINR(summary.gst)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Split equally CGST &amp; SGST</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Est. Gross Profit</p>
          <p className="mt-2 text-2xl font-semibold font-mono text-emerald-700 tabular-nums">
            {formatINR(summary.profit)}
          </p>
          <p className="mt-1 text-xs text-slate-400 tabular-nums">
            {summary.revenue > 0 ? ((summary.profit / summary.revenue) * 100).toFixed(1) : '0.0'}% margin
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900">7-Day Revenue vs Profit</h2>
          <p className="text-xs text-slate-500 mb-4">Daily store performance in INR</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} width={62} />
                <Tooltip
                  formatter={(v: unknown, name: unknown) => [
                    formatINR(Number(v ?? 0)),
                    name === 'revenue' ? 'Revenue' : 'Est. Profit',
                  ]}
                  contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col">
          <h2 className="text-base font-semibold text-slate-900">Payment Method Split</h2>
          <p className="text-xs text-slate-500 mb-2">Simulated tender distribution</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentSplit}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {paymentSplit.map((entry, idx) => (
                    <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => formatINR(Number(v ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-auto space-y-2 border-t border-slate-100 pt-3 text-xs">
            {paymentSplit.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-700">
                  <span
                    className="h-2.5 w-2.5 rounded-xs"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  {item.name}
                </span>
                <span className="font-mono font-medium text-slate-900 tabular-nums">
                  {formatINR(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Revenue + GST Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Sales by Category</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium text-slate-500">
                  <th className="px-5 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Units</th>
                  <th className="px-5 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categoryBreakdown.map((cat) => (
                  <tr key={cat.name} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-medium text-slate-800">{cat.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {cat.units}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {formatINR(cat.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">GST Tax Summary (GSTR-1 Ready)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium text-slate-500">
                  <th className="px-5 py-3">GST Slab</th>
                  <th className="px-3 py-3 text-right">Taxable</th>
                  <th className="px-3 py-3 text-right">CGST</th>
                  <th className="px-3 py-3 text-right">SGST</th>
                  <th className="px-5 py-3 text-right">Total Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gstSlabTable.map((row) => (
                  <tr key={row.rate} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-900">
                      {row.rate}%
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {formatINR(row.taxable)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {formatINR(row.cgst)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {formatINR(row.sgst)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {formatINR(row.totalTax)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
