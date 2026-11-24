import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  IndianRupee,
  Search,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import { Modal } from '@/src/components/ui/Modal';
import { ProductThumbnail } from '@/src/components/ui/ProductThumbnail';
import { usePOS } from '@/src/hooks/usePOS';
import { formatDateTime, formatINR } from '@/src/utils/format';
import type { StockMovementType } from '@/src/types/pos';

const LOCATIONS = ['Main Store Floor', 'Backroom Warehouse', 'Cold Storage'];

export function InventoryPage() {
  const { products, stockMovements, lowStockProducts, adjustStock, transferStock } = usePOS();
  const [activeTab, setActiveTab] = useState<'stock' | 'low' | 'history'>('stock');
  const [search, setSearch] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<'all' | StockMovementType>('all');

  // Stock Adjustment modal state
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjProductId, setAdjProductId] = useState(products[0]?.id ?? '');
  const [adjMode, setAdjMode] = useState<'add' | 'remove'>('add');
  const [adjQty, setAdjQty] = useState('5');
  const [adjReason, setAdjReason] = useState('Physical cycle count reconciliation');
  const [adjError, setAdjError] = useState('');
  const [pendingAdjust, setPendingAdjust] = useState<{
    productId: string;
    productName: string;
    delta: number;
    currentStock: number;
    nextStock: number;
    reason: string;
  } | null>(null);

  // Stock Transfer modal state
  const [transferOpen, setTransferOpen] = useState(false);
  const [trfProductId, setTrfProductId] = useState(products[0]?.id ?? '');
  const [trfLocation, setTrfLocation] = useState(LOCATIONS[0]);
  const [trfQty, setTrfQty] = useState('10');
  const [trfNote, setTrfNote] = useState('');
  const [trfError, setTrfError] = useState('');
  const [pendingTransfer, setPendingTransfer] = useState<{
    productId: string;
    productName: string;
    fromLocation: string;
    toLocation: string;
    qty: number;
    note: string;
  } | null>(null);

  const valuation = useMemo(() => {
    const active = products.filter((p) => p.status === 'Active');
    const totalUnits = active.reduce((s, p) => s + p.stock, 0);
    const costValue = active.reduce((s, p) => s + p.stock * p.purchasePrice, 0);
    const retailValue = active.reduce((s, p) => s + p.stock * p.sellingPrice, 0);
    const potentialMargin = retailValue - costValue;
    const outOfStock = active.filter((p) => p.stock === 0).length;
    return {
      activeCount: active.length,
      totalUnits,
      costValue,
      retailValue,
      potentialMargin,
      outOfStock,
    };
  }, [products]);

  const filteredStock = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = activeTab === 'low' ? lowStockProducts : products;
    return list.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
    );
  }, [products, lowStockProducts, activeTab, search]);

  const filteredMovements = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stockMovements.filter((m) => {
      const matchType = movementTypeFilter === 'all' || m.type === movementTypeFilter;
      const matchQ =
        !q ||
        m.productName.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q) ||
        m.reference.toLowerCase().includes(q) ||
        m.performedBy.toLowerCase().includes(q);
      return matchType && matchQ;
    });
  }, [stockMovements, search, movementTypeFilter]);

  const openAdjustFor = (productId?: string) => {
    setAdjProductId(productId ?? products[0]?.id ?? '');
    setAdjMode('add');
    setAdjQty('5');
    setAdjReason('Physical cycle count reconciliation');
    setAdjError('');
    setAdjustOpen(true);
  };

  const openTransferFor = (productId?: string) => {
    const target = products.find((p) => p.id === productId) ?? products[0];
    setTrfProductId(target?.id ?? '');
    const nextLoc = LOCATIONS.find((l) => l !== target?.location) ?? LOCATIONS[0];
    setTrfLocation(nextLoc);
    setTrfQty(String(Math.max(1, Math.min(10, target?.stock ?? 1))));
    setTrfNote('');
    setTrfError('');
    setTransferOpen(true);
  };

  const handleAdjustValidate = (e: React.FormEvent) => {
    e.preventDefault();
    const target = products.find((p) => p.id === adjProductId);
    const qty = parseInt(adjQty, 10);
    if (!target) return setAdjError('Select a product.');
    if (Number.isNaN(qty) || qty <= 0) {
      return setAdjError('Quantity must be a positive integer.');
    }
    if (adjMode === 'remove' && qty > target.stock) {
      return setAdjError(`Cannot deduct ${qty}; only ${target.stock} unit(s) currently on hand.`);
    }
    if (!adjReason.trim()) return setAdjError('Enter a reason for the stock movement audit trail.');

    const delta = adjMode === 'add' ? qty : -qty;
    setAdjError('');
    setAdjustOpen(false);
    setPendingAdjust({
      productId: target.id,
      productName: target.name,
      delta,
      currentStock: target.stock,
      nextStock: Math.max(0, target.stock + delta),
      reason: adjReason.trim(),
    });
  };

  const handleTransferValidate = (e: React.FormEvent) => {
    e.preventDefault();
    const target = products.find((p) => p.id === trfProductId);
    const qty = parseInt(trfQty, 10);
    if (!target) return setTrfError('Select a valid product.');
    if (target.location === trfLocation) {
      return setTrfError(`Item is already located in ${trfLocation}. Choose another zone.`);
    }
    if (target.stock <= 0) {
      return setTrfError('Cannot transfer a product with 0 units in stock.');
    }
    if (Number.isNaN(qty) || qty <= 0 || qty > target.stock) {
      return setTrfError(`Enter a transfer quantity between 1 and ${target.stock}.`);
    }

    setTrfError('');
    setTransferOpen(false);
    setPendingTransfer({
      productId: target.id,
      productName: target.name,
      fromLocation: target.location,
      toLocation: trfLocation,
      qty,
      note: trfNote.trim(),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Inventory Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor stock valuation, low-stock alerts, audited adjustments, and internal zone
            transfers.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={() => openTransferFor()}>
            <ArrowLeftRight className="h-4 w-4" />
            Stock Transfer
          </Button>
          <Button onClick={() => openAdjustFor()}>
            <SlidersHorizontal className="h-4 w-4" />
            Stock Adjustment
          </Button>
        </div>
      </div>

      {/* Inventory Valuation Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Inventory Valuation (Cost)</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2 text-xl font-semibold font-mono text-slate-900 tabular-nums">
            {formatINR(valuation.costValue)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {valuation.totalUnits.toLocaleString('en-IN')} units across {valuation.activeCount} active
            SKUs
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Retail Stock Value</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Boxes className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2 text-xl font-semibold font-mono text-slate-900 tabular-nums">
            {formatINR(valuation.retailValue)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">At current selling prices</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Projected Gross Margin</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2 text-xl font-semibold font-mono text-emerald-700 tabular-nums">
            {formatINR(valuation.potentialMargin)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400 tabular-nums">
            {valuation.retailValue > 0
              ? ((valuation.potentialMargin / valuation.retailValue) * 100).toFixed(1)
              : '0.0'}
            % avg markup
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Low / Out-of-Stock Alerts</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2 text-xl font-semibold font-mono text-amber-700 tabular-nums">
            {lowStockProducts.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {valuation.outOfStock} out of stock right now
          </p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 self-start overflow-x-auto max-w-full">
          {(
            [
              { id: 'stock', label: `Current Stock (${products.length})` },
              { id: 'low', label: `Low-Stock Alerts (${lowStockProducts.length})` },
              { id: 'history', label: `Movement History (${stockMovements.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 flex-1 lg:justify-end">
          {activeTab === 'history' && (
            <select
              value={movementTypeFilter}
              onChange={(e) =>
                setMovementTypeFilter(e.target.value as 'all' | StockMovementType)
              }
              aria-label="Filter by movement type"
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Movement Types</option>
              <option value="Sale">Sale</option>
              <option value="Purchase">Purchase</option>
              <option value="Adjustment">Adjustment</option>
              <option value="Transfer">Transfer</option>
              <option value="Return">Return</option>
            </select>
          )}
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === 'history'
                  ? 'Search SKU, reference, or staff...'
                  : 'Search product, brand, SKU, or zone...'
              }
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      {activeTab !== 'history' ? (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3 text-right">On Hand</th>
                  <th className="px-4 py-3 text-right">Min Level</th>
                  <th className="px-4 py-3 text-right">Cost Valuation</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                      No inventory items match this view.
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((p) => {
                    const isOut = p.stock === 0;
                    const isLow = p.stock > 0 && p.stock <= p.lowStockThreshold;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <ProductThumbnail
                              src={p.imageUrl}
                              alt={p.name}
                              categoryId={p.categoryId}
                              sku={p.sku}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 truncate">{p.name}</p>
                              <p className="font-mono text-xs text-slate-400 truncate">
                                {p.sku} · {p.brand}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{p.location}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                          {p.stock} {p.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-slate-500 tabular-nums">
                          {p.lowStockThreshold}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-slate-800 tabular-nums">
                          {formatINR(p.stock * p.purchasePrice)}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium">
                          <span
                            className={
                              isOut
                                ? 'text-red-600'
                                : isLow
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }
                          >
                            {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Healthy'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex items-center gap-3 text-xs font-medium">
                            <button
                              type="button"
                              onClick={() => openAdjustFor(p.id)}
                              className="text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              Adjust
                            </button>
                            <button
                              type="button"
                              onClick={() => openTransferFor(p.id)}
                              className="text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                              Transfer
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Date &amp; Time</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Type · Ref</th>
                  <th className="px-4 py-3 text-right">Change</th>
                  <th className="px-4 py-3 text-right">Before → After</th>
                  <th className="px-5 py-3">Staff &amp; Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                      No stock movement records match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {formatDateTime(m.date)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{m.productName}</p>
                        <p className="font-mono text-xs text-slate-400">{m.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-medium text-slate-800">{m.type}</span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span className="font-mono text-slate-500">{m.reference}</span>
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums ${
                          m.quantityChange > 0
                            ? 'text-emerald-700'
                            : m.quantityChange < 0
                            ? 'text-red-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {m.previousStock} → <span className="font-semibold text-slate-900">{m.newStock}</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        <p className="font-medium text-slate-700">{m.performedBy}</p>
                        {m.note && <p className="text-slate-500">{m.note}</p>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Form Modal */}
      <Modal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Stock Adjustment"
        subtitle="Creates a permanent stock movement record after confirmation."
        footer={
          <>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="adjust-form">
              Review Adjustment
            </Button>
          </>
        }
      >
        <form id="adjust-form" onSubmit={handleAdjustValidate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Product *</label>
            <select
              value={adjProductId}
              onChange={(e) => setAdjProductId(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku} · On hand {p.stock})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Adjustment Type
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setAdjMode('add')}
                  className={`rounded-md py-1.5 text-xs font-medium cursor-pointer ${
                    adjMode === 'add' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Add (+)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjMode('remove')}
                  className={`rounded-md py-1.5 text-xs font-medium cursor-pointer ${
                    adjMode === 'remove' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Deduct (-)
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Quantity *</label>
              <input
                type="number"
                min="1"
                value={adjQty}
                onChange={(e) => setAdjQty(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Audit Reason *</label>
            <input
              type="text"
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="e.g., Damaged pack write-off or recount surplus"
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          {adjError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {adjError}
            </p>
          )}
        </form>
      </Modal>

      {/* Stock Transfer Form Modal */}
      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Internal Stock Transfer"
        subtitle="Relocate stock across store floor, warehouse, and cold storage."
        footer={
          <>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="transfer-form">
              Review Transfer
            </Button>
          </>
        }
      >
        <form id="transfer-form" onSubmit={handleTransferValidate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Product *</label>
            <select
              value={trfProductId}
              onChange={(e) => setTrfProductId(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.location} ({p.stock} {p.unit})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Destination Zone *
              </label>
              <select
                value={trfLocation}
                onChange={(e) => setTrfLocation(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Units to Transfer *
              </label>
              <input
                type="number"
                min="1"
                value={trfQty}
                onChange={(e) => setTrfQty(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Transfer Note</label>
            <input
              type="text"
              value={trfNote}
              onChange={(e) => setTrfNote(e.target.value)}
              placeholder="e.g., Restocking front aisle before weekend rush"
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          {trfError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {trfError}
            </p>
          )}
        </form>
      </Modal>

      {/* Confirmation before Stock Adjustment */}
      <ConfirmDialog
        open={Boolean(pendingAdjust)}
        onClose={() => setPendingAdjust(null)}
        onConfirm={() => {
          if (pendingAdjust) {
            adjustStock(pendingAdjust.productId, pendingAdjust.delta, pendingAdjust.reason);
          }
        }}
        title="Confirm Stock Adjustment?"
        description={
          pendingAdjust
            ? `Adjust "${pendingAdjust.productName}" by ${
                pendingAdjust.delta > 0 ? `+${pendingAdjust.delta}` : pendingAdjust.delta
              } unit(s) (stock ${pendingAdjust.currentStock} → ${
                pendingAdjust.nextStock
              })? Reason: "${pendingAdjust.reason}". This will log a stock movement record.`
            : ''
        }
        confirmLabel="Apply Stock Adjustment"
        variant={pendingAdjust && pendingAdjust.delta < 0 ? 'destructive' : 'primary'}
      />

      {/* Confirmation before Stock Transfer */}
      <ConfirmDialog
        open={Boolean(pendingTransfer)}
        onClose={() => setPendingTransfer(null)}
        onConfirm={() => {
          if (pendingTransfer) {
            transferStock(
              pendingTransfer.productId,
              pendingTransfer.toLocation,
              pendingTransfer.qty,
              pendingTransfer.note
            );
          }
        }}
        title="Confirm Internal Stock Transfer?"
        description={
          pendingTransfer
            ? `Transfer ${pendingTransfer.qty} unit(s) of "${pendingTransfer.productName}" from ${pendingTransfer.fromLocation} to ${pendingTransfer.toLocation}? This will update its zone and create a transfer log entry.`
            : ''
        }
        confirmLabel="Confirm Transfer"
      />
    </div>
  );
}
