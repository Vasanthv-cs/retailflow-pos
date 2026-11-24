import React, { useMemo, useState } from 'react';
import { CheckCircle2, Eye, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Modal } from '@/src/components/ui/Modal';
import { usePOS } from '@/src/hooks/usePOS';
import { formatINR, formatShortDate } from '@/src/utils/format';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '@/src/types/pos';

export function PurchasesPage() {
  const {
    purchaseOrders,
    suppliers,
    products,
    createPurchaseOrder,
    receivePurchaseOrder,
  } = usePOS();

  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseOrderStatus>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewPO, setViewPO] = useState<PurchaseOrder | null>(null);

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '');
  const [expectedDate, setExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  const [draftItems, setDraftItems] = useState<PurchaseOrderItem[]>([]);
  const [selectedProdId, setSelectedProdId] = useState(products[0]?.id ?? '');
  const [selectedQty, setSelectedQty] = useState('20');
  const [error, setError] = useState('');

  const filteredPOs = useMemo(() => {
    if (statusFilter === 'all') return purchaseOrders;
    return purchaseOrders.filter((po) => po.status === statusFilter);
  }, [purchaseOrders, statusFilter]);

  const openCreateModal = () => {
    setSupplierId(suppliers[0]?.id ?? '');
    setSelectedProdId(products[0]?.id ?? '');
    setSelectedQty('20');
    setNotes('');
    setDraftItems([]);
    setError('');
    setCreateOpen(true);
  };

  const addDraftItem = () => {
    const prod = products.find((p) => p.id === selectedProdId);
    const qty = parseInt(selectedQty, 10);
    if (!prod || Number.isNaN(qty) || qty <= 0) {
      setError('Select a product and enter a valid positive quantity.');
      return;
    }
    setError('');
    setDraftItems((prev) => {
      const existing = prev.find((i) => i.productId === prod.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === prod.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          quantity: qty,
          unitCost: prod.purchasePrice,
          gstRate: prod.gstRate,
        },
      ];
    });
  };

  const draftTotal = useMemo(
    () =>
      draftItems.reduce(
        (sum, item) => sum + item.quantity * item.unitCost * (1 + item.gstRate / 100),
        0
      ),
    [draftItems]
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return setError('Select a supplier.');
    if (draftItems.length === 0) return setError('Add at least one product to the purchase order.');
    createPurchaseOrder({
      supplierId,
      expectedDate,
      items: draftItems,
      notes: notes.trim() || undefined,
    });
    setCreateOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Purchase Orders</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Issue wholesale restock orders and receive incoming stock directly into inventory.
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          New Purchase Order
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {(['all', 'Pending', 'Ordered', 'Received'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === status
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {status === 'all' ? 'All Orders' : status}
          </button>
        ))}
      </div>

      {/* PO Table */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">PO Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Order / Expected</th>
                <th className="px-4 py-3 text-right">Line Items</th>
                <th className="px-4 py-3 text-right">Total (incl. GST)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPOs.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-900">
                    {po.poNumber}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-800">{po.supplierName}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums">
                    {formatShortDate(po.orderDate)} · Due {formatShortDate(po.expectedDate)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                    {po.items.reduce((s, i) => s + i.quantity, 0)} units ({po.items.length} SKU)
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                    {formatINR(po.totalAmount)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium">
                    <span
                      className={
                        po.status === 'Received'
                          ? 'text-emerald-700'
                          : po.status === 'Ordered'
                          ? 'text-indigo-700'
                          : 'text-amber-700'
                      }
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-3">
                      {po.status !== 'Received' && (
                        <button
                          type="button"
                          onClick={() => receivePurchaseOrder(po.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer whitespace-nowrap"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark Received
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setViewPO(po)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                        title="View PO details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Purchase Order Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Purchase Order"
        subtitle="Select supplier and add products to restock."
        maxWidthClass="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="po-form">
              Create PO · {formatINR(draftTotal)}
            </Button>
          </>
        }
      >
        <form id="po-form" onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Expected Delivery Date *
              </label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
            <p className="text-xs font-medium text-slate-700">Add Order Line Item</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={selectedProdId}
                onChange={(e) => setSelectedProdId(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs focus:border-indigo-500 focus:outline-none"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku} · Cost {formatINR(p.purchasePrice)} · Stock {p.stock})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={selectedQty}
                onChange={(e) => setSelectedQty(e.target.value)}
                className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
              <Button type="button" variant="secondary" size="sm" className="h-9" onClick={addDraftItem}>
                Add Line
              </Button>
            </div>
          </div>

          {draftItems.length > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Unit Cost</th>
                    <th className="px-3 py-2 text-right">GST</th>
                    <th className="px-3 py-2 text-right">Line Total</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {draftItems.map((item) => (
                    <tr key={item.productId}>
                      <td className="px-3 py-2 font-medium text-slate-800">{item.productName}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{item.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {formatINR(item.unitCost)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{item.gstRate}%</td>
                      <td className="px-3 py-2 text-right font-mono font-medium tabular-nums">
                        {formatINR(item.quantity * item.unitCost * (1 + item.gstRate / 100))}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setDraftItems((prev) =>
                              prev.filter((i) => i.productId !== item.productId)
                            )
                          }
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Delivery Instructions / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Deliver at rear loading bay before 10 AM"
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </form>
      </Modal>

      {/* View PO Details Modal */}
      <Modal
        open={Boolean(viewPO)}
        onClose={() => setViewPO(null)}
        title={viewPO ? `Purchase Order ${viewPO.poNumber}` : ''}
        subtitle={viewPO ? `${viewPO.supplierName} · Status: ${viewPO.status}` : ''}
        footer={
          viewPO && (
            <>
              <Button variant="outline" onClick={() => setViewPO(null)}>
                Close
              </Button>
              {viewPO.status !== 'Received' && (
                <Button
                  onClick={() => {
                    receivePurchaseOrder(viewPO.id);
                    setViewPO(null);
                  }}
                >
                  Mark Received & Add to Stock
                </Button>
              )}
            </>
          )
        }
      >
        {viewPO && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 text-slate-600">
              <div>
                <p className="text-slate-400">Order Date</p>
                <p className="font-medium text-slate-900">{formatShortDate(viewPO.orderDate)}</p>
              </div>
              <div>
                <p className="text-slate-400">Expected Delivery</p>
                <p className="font-medium text-slate-900">{formatShortDate(viewPO.expectedDate)}</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Unit Cost</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewPO.items.map((item) => (
                    <tr key={item.productId}>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {item.productName}
                        <span className="block font-mono text-[10px] text-slate-400">
                          {item.sku} · GST {item.gstRate}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{item.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {formatINR(item.unitCost)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-medium tabular-nums">
                        {formatINR(item.quantity * item.unitCost * (1 + item.gstRate / 100))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {viewPO.notes && (
              <p className="text-slate-500">
                <span className="font-medium text-slate-700">Notes:</span> {viewPO.notes}
              </p>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-3 text-sm font-semibold text-slate-900">
              <span>Order Grand Total</span>
              <span className="font-mono tabular-nums">{formatINR(viewPO.totalAmount)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
