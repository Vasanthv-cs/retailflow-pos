import React, { useMemo, useState } from 'react';
import { Plus, Printer, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/src/components/ui/DataTable';
import { Modal } from '@/src/components/ui/Modal';
import { ReturnReceiptModal } from '@/src/components/ui/ReturnReceiptModal';
import { usePOS } from '@/src/hooks/usePOS';
import { formatDateTime, formatINR, round2 } from '@/src/utils/format';
import type { PaymentMethod, Return, Sale } from '@/src/types/pos';

const RETURN_REASONS = [
  { label: 'Customer changed mind (Unopened)', defaultCondition: 'Sellable' as const },
  { label: 'Wrong item billed at counter', defaultCondition: 'Sellable' as const },
  { label: 'Duplicate billing error', defaultCondition: 'Sellable' as const },
  { label: 'Damaged packaging / seal broken', defaultCondition: 'Damaged' as const },
  { label: 'Expired or near-expiry product', defaultCondition: 'Damaged' as const },
  { label: 'Product quality defect', defaultCondition: 'Damaged' as const },
];

interface DraftReturnLine {
  quantity: number;
  condition: 'Sellable' | 'Damaged';
}

export function ReturnsPage() {
  const { returns, payments, sales, processReturn } = usePOS();
  const [tableSearch, setTableSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Invoice lookup inside Return Wizard modal
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [lineMap, setLineMap] = useState<Record<string, DraftReturnLine>>({});
  const [reason, setReason] = useState(RETURN_REASONS[0].label);
  const [notes, setNotes] = useState('');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('Cash');
  const [formError, setFormError] = useState('');

  // Confirmation & generated receipt state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receiptRecord, setReceiptRecord] = useState<Return | null>(null);

  const eligibleSales = useMemo(
    () =>
      sales.filter((s) =>
        s.items.some((item) => item.quantity - item.returnedQuantity > 0)
      ),
    [sales]
  );

  const matchingInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    if (!q) return eligibleSales.slice(0, 6);
    return eligibleSales
      .filter(
        (s) =>
          s.invoiceNumber.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          (s.customerPhone ?? '').includes(q)
      )
      .slice(0, 8);
  }, [eligibleSales, invoiceSearch]);

  const selectedSale: Sale | null = useMemo(
    () => eligibleSales.find((s) => s.id === selectedSaleId) ?? null,
    [eligibleSales, selectedSaleId]
  );

  const selectInvoice = (sale: Sale) => {
    setSelectedSaleId(sale.id);
    setRefundMethod(sale.paymentMethod);
    const defaultCond =
      RETURN_REASONS.find((r) => r.label === reason)?.defaultCondition ?? 'Sellable';
    const nextMap: Record<string, DraftReturnLine> = {};
    sale.items.forEach((item) => {
      nextMap[item.productId] = { quantity: 0, condition: defaultCond };
    });
    setLineMap(nextMap);
    setFormError('');
  };

  const openModal = () => {
    setInvoiceSearch('');
    setReason(RETURN_REASONS[0].label);
    setNotes('');
    setFormError('');
    if (eligibleSales[0]) {
      selectInvoice(eligibleSales[0]);
    } else {
      setSelectedSaleId('');
      setLineMap({});
    }
    setModalOpen(true);
  };

  const handleReasonChange = (nextReason: string) => {
    setReason(nextReason);
    const defaultCond =
      RETURN_REASONS.find((r) => r.label === nextReason)?.defaultCondition ?? 'Sellable';
    setLineMap((prev) => {
      const updated: Record<string, DraftReturnLine> = {};
      Object.entries(prev).forEach(([pid, line]) => {
        updated[pid] = { ...line, condition: defaultCond };
      });
      return updated;
    });
  };

  const selectedReturnLines = useMemo(() => {
    if (!selectedSale) return [];
    return selectedSale.items
      .map((item) => {
        const draft = lineMap[item.productId];
        const qty = draft?.quantity ?? 0;
        const condition = draft?.condition ?? 'Sellable';
        const unitRefund = round2(item.lineTotal / item.quantity);
        return {
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: qty,
          maxReturnable: item.quantity - item.returnedQuantity,
          condition,
          refundAmount: round2(unitRefund * qty),
        };
      })
      .filter((l) => l.quantity > 0);
  }, [selectedSale, lineMap]);

  const estimatedRefund = useMemo(
    () => round2(selectedReturnLines.reduce((sum, l) => sum + l.refundAmount, 0)),
    [selectedReturnLines]
  );

  const restockCount = useMemo(
    () =>
      selectedReturnLines
        .filter((l) => l.condition === 'Sellable')
        .reduce((s, l) => s + l.quantity, 0),
    [selectedReturnLines]
  );

  const damagedCount = useMemo(
    () =>
      selectedReturnLines
        .filter((l) => l.condition === 'Damaged')
        .reduce((s, l) => s + l.quantity, 0),
    [selectedReturnLines]
  );

  const handleReviewReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return setFormError('Search and select an existing invoice first.');
    if (selectedReturnLines.length === 0) {
      return setFormError('Enter a return quantity for at least one product.');
    }
    for (const line of selectedReturnLines) {
      if (line.quantity > line.maxReturnable) {
        return setFormError(
          `Return quantity for ${line.productName} cannot exceed ${line.maxReturnable}.`
        );
      }
    }
    setFormError('');
    setConfirmOpen(true);
  };

  const handleFinalizeReturn = () => {
    if (!selectedSale) return;
    const res = processReturn({
      saleId: selectedSale.id,
      items: selectedReturnLines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        condition: l.condition,
      })),
      reason,
      notes,
      refundMethod,
    });
    if (!res.ok) {
      setFormError(res.error ?? 'Unable to complete simulated refund.');
      return;
    }
    setModalOpen(false);
    if (res.returnRecord) {
      setReceiptRecord(res.returnRecord);
    }
  };

  const filteredReturns = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return returns.filter(
      (r) =>
        !q ||
        r.returnNumber.toLowerCase().includes(q) ||
        r.invoiceNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
    );
  }, [returns, tableSearch]);

  const refundLedgerSummary = useMemo(() => {
    const refundPayments = payments.filter((p) => p.type === 'Refund');
    const totalRefunded = refundPayments.reduce((sum, p) => sum + p.amount, 0);
    return { count: refundPayments.length, totalRefunded };
  }, [payments]);

  const columns: DataTableColumn<Return>[] = [
    {
      key: 'ref',
      header: 'Return # · Orig. Invoice',
      render: (ret) => (
        <div className="font-mono text-xs">
          <p className="font-semibold text-slate-900">{ret.returnNumber}</p>
          <p className="text-slate-400">{ret.invoiceNumber}</p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date & Time',
      render: (ret) => (
        <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
          {formatDateTime(ret.date)}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (ret) => (
        <div>
          <p className="font-medium text-slate-800">{ret.customerName}</p>
          <p className="text-xs text-slate-400">By {ret.processedBy}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Returned Products',
      render: (ret) => (
        <div className="space-y-0.5 text-xs">
          {ret.items.map((item) => (
            <p key={item.productId} className="text-slate-700">
              {item.productName} × {item.quantity}{' '}
              <span
                className={
                  item.condition === 'Sellable'
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }
              >
                ({item.condition === 'Sellable' ? 'Restocked' : 'Damaged'})
              </span>
            </p>
          ))}
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason & Refund Ref',
      render: (ret) => (
        <div className="text-xs">
          <p className="text-slate-700">{ret.reason}</p>
          <p className="font-mono text-[11px] text-slate-400">
            {ret.refundMethod} · {ret.refundReference}
          </p>
        </div>
      ),
    },
    {
      key: 'refund',
      header: 'Refund Amount',
      align: 'right',
      render: (ret) => (
        <span className="font-mono text-xs font-semibold text-red-600 tabular-nums">
          -{formatINR(ret.totalRefund)}
        </span>
      ),
    },
    {
      key: 'receipt',
      header: 'Receipt',
      align: 'right',
      render: (ret) => (
        <button
          type="button"
          onClick={() => setReceiptRecord(ret)}
          title="View & print return receipt"
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer whitespace-nowrap"
        >
          <Printer className="h-3.5 w-3.5" />
          Receipt
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Returns &amp; Refunds
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Process customer returns against existing invoices with sellable restocking, damaged
            write-off control, and printable return receipts.
          </p>
        </div>
        <Button onClick={openModal} disabled={eligibleSales.length === 0}>
          <Plus className="h-4 w-4" />
          Process New Return
        </Button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Return Slips Issued</p>
          <p className="mt-1.5 text-xl font-semibold font-mono text-slate-900 tabular-nums">
            {returns.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Original sales preserved in history</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Separate Refund Entries</p>
          <p className="mt-1.5 text-xl font-semibold font-mono text-slate-900 tabular-nums">
            {refundLedgerSummary.count}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Tracked separately in payments ledger</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Simulated Refunds</p>
          <p className="mt-1.5 text-xl font-semibold font-mono text-red-600 tabular-nums">
            {formatINR(refundLedgerSummary.totalRefunded)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Simulated prototype payouts</p>
        </div>
      </div>

      {/* Search Returns */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Search return slip #, original invoice #, customer, or reason..."
            className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredReturns}
        rowKey={(ret) => ret.id}
        emptyMessage="No customer returns match your search."
      />

      {/* Process Return Wizard Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Process Customer Return & Simulated Refund"
        subtitle="Search an invoice, select products and quantities, and specify sellable vs damaged condition."
        maxWidthClass="max-w-3xl"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="return-wizard-form"
              disabled={selectedReturnLines.length === 0}
            >
              <RotateCcw className="h-4 w-4" />
              Review Simulated Refund · {formatINR(estimatedRefund)}
            </Button>
          </>
        }
      >
        <form id="return-wizard-form" onSubmit={handleReviewReturn} className="space-y-4">
          {/* Step 1: Search & Pick Invoice */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              1. Search Existing Invoice *
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="Type invoice number (e.g. INV-2026-1048) or customer name..."
                className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 max-h-36 overflow-y-auto pt-1">
              {matchingInvoices.length === 0 ? (
                <p className="col-span-2 py-3 text-center text-xs text-slate-500">
                  No return-eligible invoices match &quot;{invoiceSearch}&quot;.
                </p>
              ) : (
                matchingInvoices.map((inv) => {
                  const active = inv.id === selectedSaleId;
                  return (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => selectInvoice(inv)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                        active
                          ? 'border-indigo-600 bg-indigo-50/70'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-mono font-semibold text-slate-900">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-slate-500 truncate">{inv.customerName}</p>
                      </div>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                        {formatINR(inv.totalAmount)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 2: Select Return Reason & Refund Mode */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                2. Return Reason *
              </label>
              <select
                value={reason}
                onChange={(e) => handleReasonChange(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                {RETURN_REASONS.map((r) => (
                  <option key={r.label} value={r.label}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Refund Mode (Simulated) *
              </label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
              </select>
            </div>
          </div>

          {/* Step 3: Select Products, Return Quantity & Condition */}
          {selectedSale && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">
                  3. Select Items to Return from {selectedSale.invoiceNumber}
                </span>
                <span className="text-slate-400">
                  Sellable items restore stock · Damaged items are not restocked
                </span>
              </div>

              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2 text-right">Eligible Qty</th>
                      <th className="px-3 py-2 text-right">Return Qty</th>
                      <th className="px-3 py-2">Condition</th>
                      <th className="px-3 py-2 text-right">Refund</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSale.items.map((item) => {
                      const maxRet = item.quantity - item.returnedQuantity;
                      const draft = lineMap[item.productId] ?? {
                        quantity: 0,
                        condition: 'Sellable' as const,
                      };
                      const unitRefund = round2(item.lineTotal / item.quantity);

                      return (
                        <tr key={item.productId} className={maxRet === 0 ? 'opacity-50' : ''}>
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-slate-900">{item.productName}</p>
                            <p className="font-mono text-[10px] text-slate-400">
                              {item.sku} · Purchased {item.quantity}
                              {item.returnedQuantity > 0
                                ? ` · Already returned ${item.returnedQuantity}`
                                : ''}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600">
                            {maxRet}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <input
                              type="number"
                              min={0}
                              max={maxRet}
                              disabled={maxRet === 0}
                              value={draft.quantity}
                              onChange={(e) => {
                                const parsed = parseInt(e.target.value, 10);
                                const clamped = Number.isNaN(parsed)
                                  ? 0
                                  : Math.max(0, Math.min(maxRet, parsed));
                                setLineMap((prev) => ({
                                  ...prev,
                                  [item.productId]: { ...draft, quantity: clamped },
                                }));
                              }}
                              className="h-8 w-16 rounded-md border border-slate-200 px-2 text-right font-mono text-xs tabular-nums focus:border-indigo-500 focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              disabled={maxRet === 0}
                              value={draft.condition}
                              onChange={(e) =>
                                setLineMap((prev) => ({
                                  ...prev,
                                  [item.productId]: {
                                    ...draft,
                                    condition: e.target.value as 'Sellable' | 'Damaged',
                                  },
                                }))
                              }
                              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                            >
                              <option value="Sellable">Sellable (Restock)</option>
                              <option value="Damaged">Damaged (Do Not Restock)</option>
                            </select>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-medium text-slate-900 tabular-nums">
                            {formatINR(unitRefund * draft.quantity)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Additional Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Inspected by shift supervisor"
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Live Summary Box */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
            <div className="text-slate-600">
              <span>Sellable to restock: </span>
              <span className="font-mono font-semibold text-emerald-700">{restockCount}</span>
              <span className="mx-2 text-slate-300">·</span>
              <span>Damaged (excluded): </span>
              <span className="font-mono font-semibold text-amber-700">{damagedCount}</span>
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">
              Refund Total: {formatINR(estimatedRefund)}
            </div>
          </div>

          {formError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </p>
          )}
        </form>
      </Modal>

      {/* Confirmation Dialog before executing simulated refund */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleFinalizeReturn}
        title="Confirm Simulated Refund?"
        description={
          selectedSale
            ? `Issue a simulated ${refundMethod} refund of ${formatINR(estimatedRefund)} against ${selectedSale.invoiceNumber}? ${
                restockCount > 0
                  ? `${restockCount} sellable unit(s) will be added back to inventory. `
                  : ''
              }${
                damagedCount > 0
                  ? `${damagedCount} damaged unit(s) will NOT be restored to sellable stock. `
                  : ''
              }The original invoice will remain preserved in Sales History.`
            : ''
        }
        confirmLabel="Confirm Refund & Generate Receipt"
        variant="destructive"
      />

      {/* Return Credit Receipt Modal */}
      <ReturnReceiptModal
        returnRecord={receiptRecord}
        onClose={() => setReceiptRecord(null)}
      />
    </div>
  );
}
