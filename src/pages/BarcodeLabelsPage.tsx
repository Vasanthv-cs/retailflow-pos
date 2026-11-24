import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  Check,
  Layers,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { usePOS } from '@/src/hooks/usePOS';
import { Button } from '@/src/components/ui/Button';
import { ProductThumbnail } from '@/src/components/ui/ProductThumbnail';
import { BarcodeLabelCard } from '@/src/components/ui/BarcodeLabelCard';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { barcodeLabelService } from '@/src/services/posService';
import {
  THERMAL_LABEL_DIMENSIONS_MM,
  buildPrintableLabelBatch,
  resolveProductBarcodeValue,
  triggerBarcodeLabelPrint,
  validateCode128Value,
} from '@/src/utils/barcodeLabels';
import { formatINR } from '@/src/utils/format';
import { cn } from '@/src/utils/cn';
import type { BarcodePrintLayout, BarcodeSource } from '@/src/types/pos';

export function BarcodeLabelsPage() {
  const {
    products,
    categories,
    settings,
    barcodeLabelQueue,
    setBarcodeLabelQueue,
    addToast,
  } = usePOS();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [barcodeSource, setBarcodeSource] = useState<BarcodeSource>('barcode');
  const [printLayout, setPrintLayout] = useState<BarcodePrintLayout>('thermal-roll');
  const [previewZoom, setPreviewZoom] = useState<'100' | '125'>('125');
  const [showAllCopies, setShowAllCopies] = useState(true);

  const queueMap = useMemo(
    () => new Map(barcodeLabelQueue.map((item) => [item.productId, item.quantity])),
    [barcodeLabelQueue]
  );

  const activeProducts = useMemo(
    () => products.filter((p) => p.status === 'Active'),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeProducts.filter((p) => {
      if (categoryFilter !== 'ALL' && p.categoryId !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      );
    });
  }, [activeProducts, search, categoryFilter]);

  const expandedLabels = useMemo(
    () =>
      buildPrintableLabelBatch(
        products,
        barcodeLabelQueue,
        settings.storeName,
        barcodeSource
      ),
    [products, barcodeLabelQueue, settings.storeName, barcodeSource]
  );

  const previewLabels = useMemo(() => {
    if (showAllCopies) return expandedLabels;
    const seen = new Set<string>();
    return expandedLabels.filter((lbl) => {
      if (seen.has(lbl.productId)) return false;
      seen.add(lbl.productId);
      return true;
    });
  }, [expandedLabels, showAllCopies]);

  const validPrintableLabels = useMemo(
    () => expandedLabels.filter((l) => l.valid),
    [expandedLabels]
  );

  const invalidProductCount = useMemo(() => {
    const invalidIds = new Set(expandedLabels.filter((l) => !l.valid).map((l) => l.productId));
    return invalidIds.size;
  }, [expandedLabels]);

  const toggleProductInQueue = (productId: string) => {
    setBarcodeLabelQueue((prev) => {
      const exists = prev.some((i) => i.productId === productId);
      if (exists) {
        return prev.filter((i) => i.productId !== productId);
      }
      return [...prev, { productId, quantity: 2 }];
    });
  };

  const updateProductQuantity = (productId: string, nextQty: number) => {
    const clamped = Math.max(1, Math.min(200, Math.floor(nextQty || 1)));
    setBarcodeLabelQueue((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: clamped } : i))
    );
  };

  const selectFilteredProducts = () => {
    setBarcodeLabelQueue((prev) => {
      const map = new Map(prev.map((i) => [i.productId, i.quantity]));
      for (const p of filteredProducts) {
        if (!map.has(p.id)) {
          map.set(p.id, 1);
        }
      }
      return Array.from(map.entries()).map(([productId, quantity]) => ({
        productId,
        quantity,
      }));
    });
  };

  const clearQueue = () => {
    setBarcodeLabelQueue([]);
  };

  const handlePrint = () => {
    if (validPrintableLabels.length === 0) {
      addToast(
        'No valid labels to print',
        'error',
        'Select at least one product with a valid Code 128 barcode or switch to SKU.'
      );
      return;
    }

    const batchLog = barcodeLabelService.logPrintBatch(
      Array.from(new Set(validPrintableLabels.map((l) => l.productId))),
      validPrintableLabels.length,
      printLayout
    );

    triggerBarcodeLabelPrint(printLayout);

    addToast(
      `Prepared ${validPrintableLabels.length} barcode label(s) for print`,
      'success',
      `Batch ${batchLog.batchId} · ${
        printLayout === 'thermal-roll'
          ? '50mm × 25mm Thermal Roll'
          : 'A4 Multi-Up 50mm × 25mm Grid'
      }`
    );
  };

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'General';

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Barcode Labels
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate print-ready Code 128 thermal labels ({THERMAL_LABEL_DIMENSIONS_MM.width}mm ×{' '}
            {THERMAL_LABEL_DIMENSIONS_MM.height}mm) for shelves and item packaging.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {barcodeLabelQueue.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearQueue}>
              <RotateCcw className="h-3.5 w-3.5" />
              Clear Queue
            </Button>
          )}
          <Button
            onClick={handlePrint}
            disabled={validPrintableLabels.length === 0}
            className="shadow-xs"
          >
            <Printer className="h-4 w-4" />
            Print Labels ({validPrintableLabels.length})
          </Button>
        </div>
      </div>

      {/* Configuration Strip */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          {/* Barcode Source */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Encode</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setBarcodeSource('barcode')}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                  barcodeSource === 'barcode'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Product Barcode
              </button>
              <button
                type="button"
                onClick={() => setBarcodeSource('sku')}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                  barcodeSource === 'sku'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Product SKU
              </button>
            </div>
          </div>

          <span className="hidden sm:inline text-slate-200">|</span>

          {/* Print Layout */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Paper</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setPrintLayout('thermal-roll')}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                  printLayout === 'thermal-roll'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Thermal Roll (50×25mm)
              </button>
              <button
                type="button"
                onClick={() => setPrintLayout('a4-sheet')}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                  printLayout === 'a4-sheet'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                A4 Label Sheet
              </button>
            </div>
          </div>
        </div>

        {/* Summary Readout */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 tabular-nums">
          <span className="font-medium text-slate-800">{barcodeLabelQueue.length} SKU(s)</span>
          <span>·</span>
          <span className="font-mono font-medium text-indigo-600">
            {expandedLabels.length} label(s)
          </span>
          <span>·</span>
          <span>50mm × 25mm</span>
          <span>·</span>
          <span>Code 128 SVG</span>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Left Panel: Product Selector & Quantity Queue */}
        <section className="lg:col-span-5 flex flex-col rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Select Products</h2>
              <button
                type="button"
                onClick={selectFilteredProducts}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Add all shown ({filteredProducts.length})
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product, SKU, or barcode..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by category"
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Rows */}
          <div className="max-h-[540px] overflow-y-auto divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Barcode}
                  title="No matching products"
                  description="Try clearing the search query or switching to another category."
                />
              </div>
            ) : (
              filteredProducts.map((product) => {
                const qty = queueMap.get(product.id);
                const isSelected = qty !== undefined;
                const codeValue = resolveProductBarcodeValue(product, barcodeSource);
                const validation = validateCode128Value(codeValue);

                return (
                  <div
                    key={product.id}
                    className={cn(
                      'group flex items-center gap-3 px-4 py-3 transition-colors',
                      isSelected ? 'bg-indigo-50/35' : 'hover:bg-slate-50/80'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleProductInQueue(product.id)}
                      aria-label={
                        isSelected
                          ? `Remove ${product.name} from label queue`
                          : `Add ${product.name} to label queue`
                      }
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer',
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 bg-white hover:border-indigo-400'
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                    </button>

                    <ProductThumbnail
                      src={product.imageUrl}
                      alt={product.name}
                      categoryId={product.categoryId}
                      sku={product.sku}
                      size="sm"
                    />

                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => toggleProductInQueue(product.id)}
                    >
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {product.name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
                        <span className="font-mono text-slate-600">{codeValue || 'No code'}</span>
                        <span>·</span>
                        <span className="truncate">{categoryName(product.categoryId)}</span>
                        <span>·</span>
                        <span className="font-mono font-medium text-slate-800 tabular-nums">
                          {formatINR(product.sellingPrice)}
                        </span>
                      </div>
                      {!validation.valid && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-amber-700">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {validation.error}
                        </p>
                      )}
                    </div>

                    {isSelected ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateProductQuantity(product.id, qty - 1)}
                          disabled={qty <= 1}
                          aria-label="Decrease label quantity"
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={200}
                          value={qty}
                          onChange={(e) =>
                            updateProductQuantity(product.id, Number(e.target.value))
                          }
                          aria-label={`Label copies for ${product.name}`}
                          className="h-7 w-12 rounded-md border border-slate-200 bg-white text-center font-mono text-xs font-semibold text-slate-900 tabular-nums focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateProductQuantity(product.id, qty + 1)}
                          disabled={qty >= 200}
                          aria-label="Increase label quantity"
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleProductInQueue(product.id)}
                          aria-label={`Remove ${product.name}`}
                          className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleProductInQueue(product.id)}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors cursor-pointer shrink-0"
                      >
                        Add
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Panel: Live 50mm x 25mm Thermal Print Preview */}
        <section className="lg:col-span-7 flex flex-col rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Print Preview</h2>
              <p className="text-xs text-slate-500">
                Exact 50mm × 25mm thermal proportion · Store name, item, Code 128, SKU & INR price
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAllCopies((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                {showAllCopies ? 'All Copies' : 'Unique Only'}
              </button>
              <button
                type="button"
                onClick={() => setPreviewZoom((z) => (z === '100' ? '125' : '100'))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer tabular-nums"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                {previewZoom}%
              </button>
            </div>
          </div>

          {invalidProductCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 bg-amber-50/70 px-5 py-2.5 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  {invalidProductCount} selected product(s) have a missing or invalid{' '}
                  {barcodeSource} value and will be skipped during printing.
                </span>
              </div>
              {barcodeSource === 'barcode' && (
                <button
                  type="button"
                  onClick={() => setBarcodeSource('sku')}
                  className="font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700 cursor-pointer"
                >
                  Use Product SKU instead
                </button>
              )}
            </div>
          )}

          {/* Preview Canvas */}
          <div className="min-h-[460px] max-h-[600px] overflow-auto bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] bg-slate-50/80 p-6">
            {previewLabels.length === 0 ? (
              <div className="flex h-full min-h-[380px] items-center justify-center">
                <EmptyState
                  icon={Barcode}
                  title="Your label print queue is empty"
                  description="Select one or more products from the catalog on the left to preview 50mm × 25mm Code 128 labels."
                  className="bg-white/95 max-w-md"
                />
              </div>
            ) : printLayout === 'thermal-roll' ? (
              <div className="flex flex-col items-center">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-mono text-slate-500">
                  <span>← 50mm thermal roll width →</span>
                </div>
                <div
                  className="flex flex-col items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-100/80 px-5 py-5 shadow-inner origin-top transition-transform"
                  style={{
                    transform: previewZoom === '125' ? 'scale(1.2)' : 'scale(1)',
                    marginBottom: previewZoom === '125' ? `${previewLabels.length * 18}px` : 0,
                  }}
                >
                  {previewLabels.map((lbl) => (
                    <div key={lbl.key} className="relative">
                      <BarcodeLabelCard label={lbl} mode="preview" />
                      {!showAllCopies && lbl.copyCount > 1 && (
                        <span className="mt-1 block text-center font-mono text-[10px] text-slate-500 tabular-nums">
                          ×{lbl.copyCount} copies
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-[700px] rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-2 text-[11px] font-mono text-slate-400">
                  <span>A4 Multi-Up Sheet Preview</span>
                  <span>50mm × 25mm per label</span>
                </div>
                <div
                  className="flex flex-wrap gap-3 origin-top-left transition-transform"
                  style={{
                    transform: previewZoom === '125' ? 'scale(1.08)' : 'scale(1)',
                  }}
                >
                  {previewLabels.map((lbl) => (
                    <div key={lbl.key} className="flex flex-col items-center">
                      <BarcodeLabelCard label={lbl} mode="preview" />
                      {!showAllCopies && lbl.copyCount > 1 && (
                        <span className="mt-1 font-mono text-[10px] text-slate-500 tabular-nums">
                          ×{lbl.copyCount} copies
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Printer Tips Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
            <span>
              In your browser print dialog, set margins to <strong className="font-medium text-slate-700">None</strong> and scale to <strong className="font-medium text-slate-700">100%</strong> for 50×25mm thermal printers.
            </span>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              {validPrintableLabels.length} ready
            </span>
          </div>
        </section>
      </div>

      {/* Dedicated Hidden Print Container (Printed cleanly via @media print) */}
      <div id="barcode-labels-printable" className="hidden" aria-hidden="true">
        {validPrintableLabels.map((lbl) => (
          <BarcodeLabelCard key={`print-${lbl.key}`} label={lbl} mode="print" />
        ))}
      </div>
    </div>
  );
}
