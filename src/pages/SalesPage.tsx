import { useMemo, useState } from 'react';
import { Calendar, Download, Eye, Printer, Search, X } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { DataTable, type DataTableColumn } from '@/src/components/ui/DataTable';
import { Modal } from '@/src/components/ui/Modal';
import { ReceiptModal } from '@/src/components/ui/ReceiptModal';
import { usePOS } from '@/src/hooks/usePOS';
import { downloadCSV, formatDateTime, formatINR } from '@/src/utils/format';
import type { PaymentMethod, Sale, SaleStatus } from '@/src/types/pos';

export function SalesPage() {
  const { sales, returns, addToast } = usePOS();
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentMethod>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | SaleStatus>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  const applyDatePreset = (days: number | 'all' | 'today') => {
    if (days === 'all') {
      setDateFrom('');
      setDateTo('');
      return;
    }
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    if (days === 'today') {
      setDateFrom(toStr);
      setDateTo(toStr);
      return;
    }
    const from = new Date(today);
    from.setDate(from.getDate() - days);
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(toStr);
  };

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return sales.filter((s) => {
      const matchQ =
        !q ||
        s.invoiceNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q);
      const matchPay = paymentFilter === 'all' || s.paymentMethod === paymentFilter;
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      const saleTs = new Date(s.date).getTime();
      const matchFrom = fromTs === null || saleTs >= fromTs;
      const matchTo = toTs === null || saleTs <= toTs;
      return matchQ && matchPay && matchStatus && matchFrom && matchTo;
    });
  }, [sales, search, paymentFilter, statusFilter, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const sum = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const gst = filteredSales.reduce((acc, s) => acc + s.taxAmount, 0);
    return { count: filteredSales.length, sum, gst };
  }, [filteredSales]);

  const handleExportCSV = () => {
    if (filteredSales.length === 0) {
      addToast('Nothing to export', 'error', 'Adjust filters so at least one invoice is listed.');
      return;
    }
    downloadCSV(
      `retailflow-sales-history-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'Invoice Number',
        'Date & Time',
        'Cashier',
        'Customer',
        'Payment Method',
        'Sale Status',
        'Taxable Subtotal',
        'Discount',
        'GST',
        'Total Amount',
      ],
      filteredSales.map((s) => [
        s.invoiceNumber,
        formatDateTime(s.date),
        s.cashierName,
        s.customerName,
        s.paymentMethod,
        s.status,
        s.subtotal,
        s.discountAmount,
        s.taxAmount,
        s.totalAmount,
      ])
    );
    addToast(
      `Exported ${filteredSales.length} invoice(s)`,
      'success',
      'Sales history CSV downloaded.'
    );
  };

  const hasFilters = Boolean(
    search || paymentFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo
  );

  const columns: DataTableColumn<Sale>[] = [
    {
      key: 'invoice',
      header: 'Invoice Number',
      render: (sale) => (
        <span className="font-mono text-xs font-semibold text-slate-900">
          {sale.invoiceNumber}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date & Time',
      render: (sale) => (
        <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
          {formatDateTime(sale.date)}
        </span>
      ),
    },
    {
      key: 'cashier',
      header: 'Cashier',
      render: (sale) => <span className="text-xs text-slate-700">{sale.cashierName}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (sale) => (
        <div>
          <p className="font-medium text-slate-800">{sale.customerName}</p>
          {sale.customerPhone && (
            <p className="font-mono text-[11px] text-slate-400">{sale.customerPhone}</p>
          )}
        </div>
      ),
    },
    {
      key: 'payment',
      header: 'Payment Method',
      render: (sale) => <span className="text-xs text-slate-700">{sale.paymentMethod}</span>,
    },
    {
      key: 'status',
      header: 'Sale Status',
      render: (sale) => (
        <span
          className={`text-xs font-medium ${
            sale.status === 'Completed'
              ? 'text-emerald-700'
              : sale.status === 'Returned'
              ? 'text-red-600'
              : 'text-amber-700'
          }`}
        >
          {sale.status}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total Amount',
      align: 'right',
      render: (sale) => (
        <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
          {formatINR(sale.totalAmount)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (sale) => (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDetailSale(sale)}
            title="View sale details"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setReceiptSale(sale)}
            title="Receipt preview & print"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const linkedReturns = useMemo(() => {
    if (!detailSale) return [];
    return returns.filter((r) => r.saleId === detailSale.id);
  }, [detailSale, returns]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sales History</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search invoices, filter by date range and payment mode, inspect GST details, reprint
            receipts, or export CSV.
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4" />
          Export CSV ({filteredSales.length})
        </Button>
      </div>

      {/* Filters & Date Range Bar */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice number (e.g. INV-2026-1048), customer, or cashier..."
              className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as 'all' | PaymentMethod)}
              aria-label="Filter by payment method"
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Payment Modes</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | SaleStatus)}
              aria-label="Filter by sale status"
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Partial Return">Partial Return</option>
              <option value="Returned">Returned</option>
            </select>
          </div>
        </div>

        {/* Date Range Filter Row */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Date Range:
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="From date"
              className="h-8 rounded-lg border border-slate-200 px-2.5 font-mono text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="To date"
              className="h-8 rounded-lg border border-slate-200 px-2.5 font-mono text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => applyDatePreset('today')}
                className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset(7)}
                className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                7D
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset(30)}
                className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                30D
              </button>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPaymentFilter('all');
                  setStatusFilter('all');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 ml-1 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>

          <p className="text-xs font-mono text-slate-500 tabular-nums">
            {totals.count} invoice(s) · Total {formatINR(totals.sum)} · GST {formatINR(totals.gst)}
          </p>
        </div>
      </div>

      {/* Reusable DataTable */}
      <DataTable
        columns={columns}
        data={filteredSales}
        rowKey={(sale) => sale.id}
        emptyMessage="No sales invoices match the selected date range or filters."
      />

      {/* Sale Details Modal */}
      <Modal
        open={Boolean(detailSale)}
        onClose={() => setDetailSale(null)}
        title={detailSale ? `Invoice ${detailSale.invoiceNumber}` : ''}
        subtitle={
          detailSale
            ? `${formatDateTime(detailSale.date)} · Cashier: ${detailSale.cashierName}`
            : ''
        }
        maxWidthClass="max-w-2xl"
        footer={
          detailSale && (
            <>
              <Button variant="outline" onClick={() => setDetailSale(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  const target = detailSale;
                  setDetailSale(null);
                  setReceiptSale(target);
                }}
              >
                <Printer className="h-4 w-4" />
                Receipt Preview &amp; Print
              </Button>
            </>
          )
        }
      >
        {detailSale && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-slate-400">Customer</p>
                <p className="mt-0.5 font-medium text-slate-900">{detailSale.customerName}</p>
              </div>
              <div>
                <p className="text-slate-400">Payment Mode</p>
                <p className="mt-0.5 font-medium text-slate-900">
                  {detailSale.paymentMethod} (Simulated)
                </p>
              </div>
              <div>
                <p className="text-slate-400">Reference</p>
                <p className="mt-0.5 font-mono text-slate-700">
                  {detailSale.paymentReference ?? 'Cash Drawer'}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Status</p>
                <p className="mt-0.5 font-medium text-slate-900">{detailSale.status}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-right">GST</th>
                    <th className="px-3 py-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detailSale.items.map((item) => (
                    <tr key={item.productId}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">{item.productName}</p>
                        <p className="font-mono text-[10px] text-slate-400">
                          {item.sku}
                          {item.returnedQuantity > 0 &&
                            ` · Returned ${item.returnedQuantity} of ${item.quantity}`}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {formatINR(item.unitPrice)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {item.gstRate}% ({formatINR(item.taxAmount)})
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-medium tabular-nums">
                        {formatINR(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {linkedReturns.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-1">
                <p className="font-medium text-amber-900">
                  Separate Refund Record(s) Linked to This Invoice
                </p>
                {linkedReturns.map((ret) => (
                  <p key={ret.id} className="font-mono text-[11px] text-amber-800 tabular-nums">
                    {ret.returnNumber} · {formatINR(ret.totalRefund)} via {ret.refundMethod} ·{' '}
                    {ret.reason}
                  </p>
                ))}
              </div>
            )}

            <div className="ml-auto max-w-xs space-y-1.5 pt-2 tabular-nums">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Subtotal</span>
                <span className="font-mono">{formatINR(detailSale.subtotal)}</span>
              </div>
              {detailSale.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span className="font-mono">-{formatINR(detailSale.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>CGST + SGST</span>
                <span className="font-mono">
                  {formatINR(detailSale.cgstAmount)} + {formatINR(detailSale.sgstAmount)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
                <span>Original Invoice Total</span>
                <span className="font-mono">{formatINR(detailSale.totalAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ReceiptModal sale={receiptSale} onClose={() => setReceiptSale(null)} />
    </div>
  );
}
