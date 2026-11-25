import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Banknote,
  Barcode,
  Camera,
  CheckCircle2,
  CreditCard,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { CameraScannerDialog } from '@/src/components/ui/CameraScannerDialog';
import { Modal } from '@/src/components/ui/Modal';
import { ProductThumbnail } from '@/src/components/ui/ProductThumbnail';
import { ReceiptModal } from '@/src/components/ui/ReceiptModal';
import { usePOS } from '@/src/hooks/usePOS';
import { calculateCartTotals, formatINR } from '@/src/utils/format';
import { cn } from '@/src/utils/cn';
import type { CartItem, PaymentMethod, Product, Sale } from '@/src/types/pos';

export function POSTerminalPage() {
  const { products, categories, settings, completeSale, addToast } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [discountInput, setDiscountInput] = useState<string>('0');

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [checkoutError, setCheckoutError] = useState<string>('');
  const [completedReceipt, setCompletedReceipt] = useState<Sale | null>(null);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeProducts = useMemo(
    () => products.filter((p) => p.status === 'Active'),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeProducts.filter((p) => {
      const catMatch = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const queryMatch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q);
      return catMatch && queryMatch;
    });
  }, [activeProducts, selectedCategory, searchQuery]);

  // Keep keyboard highlight within bounds when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, selectedCategory]);

  const discountValue = useMemo(() => {
    const num = parseFloat(discountInput);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  }, [discountInput]);

  const totals = useMemo(
    () =>
      calculateCartTotals(cart, discountType, discountValue, settings.taxInclusivePricing),
    [cart, discountType, discountValue, settings.taxInclusivePricing]
  );

  const numericCashTendered = useMemo(() => {
    if (!cashTendered.trim()) return totals.grandTotal;
    const parsed = parseFloat(cashTendered);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [cashTendered, totals.grandTotal]);

  const changeDue = Math.max(0, numericCashTendered - totals.grandTotal);

  const totalItemUnits = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const getCategoryName = useCallback(
    (id: string) => categories.find((c) => c.id === id)?.name ?? 'General',
    [categories]
  );

  const addToCart = useCallback(
    (product: Product) => {
      if (product.stock <= 0) {
        addToast('Out of stock', 'error', `${product.name} has 0 units available.`);
        return;
      }
      setCheckoutError('');
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        if (existing) {
          if (existing.quantity >= product.stock) {
            addToast(
              'Stock limit reached',
              'error',
              `Cannot exceed available stock (${product.stock} ${product.unit}).`
            );
            return prev;
          }
          return prev.map((i) =>
            i.productId === product.id
              ? { ...i, quantity: i.quantity + 1, maxStock: product.stock }
              : i
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            sellingPrice: product.sellingPrice,
            purchasePrice: product.purchasePrice,
            gstRate: product.gstRate,
            quantity: 1,
            maxStock: product.stock,
          },
        ];
      });
    },
    [addToast]
  );

  const updateCartQty = useCallback(
    (productId: string, nextQty: number) => {
      setCheckoutError('');
      if (nextQty <= 0) {
        setCart((prev) => prev.filter((i) => i.productId !== productId));
        return;
      }
      const liveProd = products.find((p) => p.id === productId);
      const limit = liveProd ? liveProd.stock : 0;
      if (nextQty > limit) {
        addToast(
          'Stock limit reached',
          'error',
          `Only ${limit} unit(s) available for ${liveProd?.name ?? 'this item'}.`
        );
        return;
      }
      setCart((prev) =>
        prev.map((i) =>
          i.productId === productId ? { ...i, quantity: nextQty, maxStock: limit } : i
        )
      );
    },
    [products, addToast]
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountInput('0');
    setCustomerName('');
    setCustomerPhone('');
    setCashTendered('');
    setPaymentRef('');
    setCheckoutError('');
  }, []);

  const openPaymentDialog = useCallback(() => {
    if (cart.length === 0) {
      addToast('Cart is empty', 'error', 'Add at least one item before opening checkout.');
      return;
    }
    setCheckoutError('');
    setCashTendered(totals.grandTotal.toFixed(2));
    setPaymentModalOpen(true);
  }, [cart.length, totals.grandTotal, addToast]);

  const processScannedCode = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim().toLowerCase();
      if (!code) return;
      const match = activeProducts.find(
        (p) => p.barcode.toLowerCase() === code || p.sku.toLowerCase() === code
      );
      if (!match) {
        addToast('Barcode / SKU not found', 'error', `No active product matches "${rawCode.trim()}".`);
      } else {
        addToCart(match);
        addToast('Added to bill', 'info', `${match.name} (${match.sku})`);
      }
    },
    [activeProducts, addToCart, addToast]
  );

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) {
      setScannerOpen(true);
      return;
    }
    processScannedCode(barcodeInput);
    setBarcodeInput('');
  };

  const handleConfirmCheckout = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cart.length === 0) {
      setCheckoutError('Cart is empty.');
      return;
    }
    if (paymentMethod === 'Cash' && numericCashTendered + 0.009 < totals.grandTotal) {
      setCheckoutError('Cash tendered cannot be less than the invoice total.');
      return;
    }

    const res = completeSale({
      items: cart,
      discountType,
      discountValue,
      customerName,
      customerPhone,
      paymentMethod,
      paymentReference: paymentRef,
      amountTendered: paymentMethod === 'Cash' ? numericCashTendered : undefined,
    });

    if (!res.ok) {
      setCheckoutError(res.error ?? 'Could not complete checkout.');
      return;
    }

    setPaymentModalOpen(false);
    clearCart();
    if (res.sale) {
      setCompletedReceipt(res.sale);
    }
  };

  // Global cashier keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        barcodeRef.current?.focus();
        barcodeRef.current?.select();
        return;
      }

      if (e.key === 'F4') {
        e.preventDefault();
        if (!paymentModalOpen && !completedReceipt) {
          openPaymentDialog();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (paymentModalOpen) {
          e.preventDefault();
          setPaymentModalOpen(false);
          return;
        }
        if (completedReceipt) {
          e.preventDefault();
          setCompletedReceipt(null);
          return;
        }
        if (document.activeElement === searchRef.current && searchQuery) {
          setSearchQuery('');
        }
        return;
      }

      // Skip arrow/enter catalog selection if a modal is open or user is typing in barcode/cart inputs
      if (paymentModalOpen || completedReceipt) return;

      const activeEl = document.activeElement;
      const isBarcodeFocused = activeEl === barcodeRef.current;
      const isSearchFocused = activeEl === searchRef.current;
      const isOtherInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement;

      if (isBarcodeFocused) return;
      if (isOtherInput && !isSearchFocused) return;

      if (filteredProducts.length === 0) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredProducts.length);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev - 1 < 0 ? filteredProducts.length - 1 : prev - 1
        );
      } else if (e.key === 'Enter') {
        const chosen = filteredProducts[selectedIndex];
        if (chosen) {
          e.preventDefault();
          addToCart(chosen);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    paymentModalOpen,
    completedReceipt,
    searchQuery,
    filteredProducts,
    selectedIndex,
    addToCart,
    openPaymentDialog,
  ]);

  const quickCashAmounts = useMemo(() => {
    const exact = Math.ceil(totals.grandTotal);
    const rounded50 = Math.ceil(exact / 50) * 50;
    const rounded100 = Math.ceil(exact / 100) * 100;
    const rounded500 = Math.ceil(exact / 500) * 500;
    const unique = Array.from(
      new Set([totals.grandTotal, rounded50, rounded100, rounded500, 2000])
    ).filter((v) => v >= totals.grandTotal);
    return unique.slice(0, 4);
  }, [totals.grandTotal]);

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-6.25rem)]">
      {/* Compact Cashier Top Strip */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Point of Sale Billing Terminal
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 font-mono">
            Ctrl+K Search · F2 Barcode · ↑↓ + Enter Add Selected · F4 Checkout · Esc Close
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="font-mono">
            {activeProducts.length} active SKUs ·{' '}
            {settings.taxInclusivePricing ? 'GST Inclusive' : 'GST Exclusive'}
          </span>
        </div>
      </div>

      {/* Main Split Cashier Workspace: Optimized for 1366px and 1920px */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 flex-1 min-h-0">
        {/* LEFT PANEL: Search, Barcode, Categories, Scrollable Product Grid */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3 min-h-0">
          {/* Search + Barcode Strip */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs shrink-0">
            <div className="relative sm:col-span-7">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product name, brand, SKU, or barcode (Ctrl+K)"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <form onSubmit={handleBarcodeSubmit} className="sm:col-span-5 flex gap-2">
              <div className="relative flex-1">
                <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-600" />
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode / SKU (F2)"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 font-mono text-xs text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <Button type="submit" variant="secondary" className="h-11 px-3.5">
                <Camera className="h-4 w-4 sm:mr-1.5" />
                Scan
              </Button>
            </form>
          </div>

          {/* Category Segmented Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'h-9 rounded-lg px-3.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors',
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              )}
            >
              All ({activeProducts.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'h-9 rounded-lg px-3.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors',
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Scrollable Product Grid */}
          <div className="flex-1 overflow-y-auto pr-0.5">
            {filteredProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <p className="text-sm font-medium text-slate-800">
                  No active products match &quot;{searchQuery}&quot;
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Press Escape or clear filters to browse the full catalog.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4 pb-2">
                {filteredProducts.map((product, idx) => {
                  const inCart = cart.find((c) => c.productId === product.id);
                  const outOfStock = product.stock <= 0;
                  const lowStock =
                    product.stock > 0 && product.stock <= product.lowStockThreshold;
                  const isHighlighted = idx === selectedIndex;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={outOfStock}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => addToCart(product)}
                      className={cn(
                        'group flex flex-col justify-between rounded-xl border bg-white text-left overflow-hidden shadow-xs transition-all duration-150 cursor-pointer focus-visible:outline-none',
                        isHighlighted && !outOfStock
                          ? 'border-indigo-500 ring-2 ring-indigo-500/15 shadow-sm'
                          : inCart
                          ? 'border-indigo-300 bg-indigo-50/15'
                          : 'border-slate-200/80 hover:border-indigo-300 hover:shadow-sm',
                        outOfStock && 'opacity-50 cursor-not-allowed hover:border-slate-200'
                      )}
                    >
                      <div className="w-full">
                        <div className="relative">
                          <ProductThumbnail
                            src={product.imageUrl}
                            alt={product.name}
                            categoryId={product.categoryId}
                            sku={product.sku}
                            size="card"
                            className="aspect-[16/10]"
                          />
                          {inCart && (
                            <span className="absolute right-2 top-2 rounded-md bg-indigo-600 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white shadow-xs tabular-nums">
                              ×{inCart.quantity}
                            </span>
                          )}
                        </div>

                        <div className="px-3.5 pt-2.5">
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                            <span className="truncate">{getCategoryName(product.categoryId)}</span>
                            <span className="font-mono text-slate-400 shrink-0">
                              {product.sku}
                            </span>
                          </div>
                          <p className="mt-1 text-[13.5px] font-semibold text-slate-900 leading-snug line-clamp-2 min-h-[2.35rem]">
                            {product.name}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-end justify-between border-t border-slate-100 px-3.5 py-2.5 bg-slate-50/35">
                        <div>
                          <p className="font-mono text-[15px] font-bold text-slate-900 tabular-nums leading-none">
                            {formatINR(product.sellingPrice)}
                          </p>
                          <p className="mt-1 text-[10.5px] text-slate-400 font-mono">
                            GST {product.gstRate}%
                          </p>
                        </div>
                        <span
                          className={cn(
                            'text-[11.5px] font-medium tabular-nums',
                            outOfStock
                              ? 'text-red-600'
                              : lowStock
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          )}
                        >
                          {outOfStock ? 'Out of stock' : `${product.stock} ${product.unit}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Persistent Shopping Cart & Always-Visible Checkout Summary */}
        <div className="lg:col-span-5 xl:col-span-4 rounded-xl border border-slate-200/90 bg-white shadow-sm flex flex-col min-h-[520px] lg:min-h-0 lg:h-full overflow-hidden">
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                Active Bill · <span className="font-mono tabular-nums">{totalItemUnits}</span>{' '}
                {totalItemUnits === 1 ? 'unit' : 'units'}
              </h2>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-medium text-slate-500 hover:text-red-600 cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Scrollable Cart Line Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-4">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <Receipt className="h-8 w-8 text-slate-300" />
                <p className="mt-2.5 text-sm font-medium text-slate-700">Ready for next customer</p>
                <p className="mt-1 text-xs text-slate-400 max-w-[230px]">
                  Press F2 to scan a barcode, Ctrl+K to search, or click a product card to start
                  billing.
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const liveProd = products.find((p) => p.id === item.productId);
                const maxAvail = liveProd?.stock ?? item.maxStock;
                const atLimit = item.quantity >= maxAvail;

                return (
                  <div key={item.productId} className="py-3 flex items-center gap-2.5">
                    <ProductThumbnail
                      src={liveProd?.imageUrl}
                      alt={item.name}
                      categoryId={liveProd?.categoryId}
                      sku={item.sku}
                      size="xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 leading-snug truncate">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                        {formatINR(item.sellingPrice)} · GST {item.gstRate}% · Stock {maxAvail}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.productId, item.quantity - 1)}
                        aria-label={`Decrease quantity for ${item.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={maxAvail}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!Number.isNaN(val)) updateCartQty(item.productId, val);
                        }}
                        aria-label={`Quantity for ${item.name}`}
                        className="h-9 w-12 rounded-lg border border-slate-200 text-center font-mono text-sm font-semibold text-slate-900 tabular-nums focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={atLimit}
                        onClick={() => updateCartQty(item.productId, item.quantity + 1)}
                        aria-label={`Increase quantity for ${item.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="w-20 text-right font-mono text-sm font-semibold text-slate-900 tabular-nums shrink-0">
                      {formatINR(item.sellingPrice * item.quantity)}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      aria-label={`Remove ${item.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Pinned Billing Totals + Payment Mode + Primary Checkout Button */}
          <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3.5 space-y-3 shrink-0">
            {/* Discount Row */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-600">Bill Discount</span>
              <div className="flex items-center gap-1.5">
                <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    className={cn(
                      'rounded-md px-2.5 py-1 font-medium cursor-pointer',
                      discountType === 'percent'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('flat')}
                    className={cn(
                      'rounded-md px-2.5 py-1 font-medium cursor-pointer',
                      discountType === 'flat'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    ₹
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  aria-label="Discount amount"
                  className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2.5 text-right font-mono text-xs text-slate-900 tabular-nums focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Payment Mode Selector */}
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'UPI', label: 'UPI', icon: Smartphone },
                  { id: 'Cash', label: 'Cash', icon: Banknote },
                  { id: 'Card', label: 'Card', icon: CreditCard },
                ] as const
              ).map((mode) => {
                const Icon = mode.icon;
                const active = paymentMethod === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMethod(mode.id)}
                    className={cn(
                      'flex h-10 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer',
                      active
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {mode.label}
                  </button>
                );
              })}
            </div>

            {/* Financial Totals */}
            <div className="space-y-1 border-t border-slate-200 pt-2.5 text-xs tabular-nums">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono">{formatINR(totals.grossSubtotal)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span className="font-mono">-{formatINR(totals.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Tax (CGST + SGST)</span>
                <span className="font-mono">
                  {formatINR(totals.cgstAmount)} + {formatINR(totals.sgstAmount)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-bold text-slate-900">
                <span>Total Payable</span>
                <span className="font-mono">{formatINR(totals.grandTotal)}</span>
              </div>
            </div>

            {/* Always-Visible Primary Checkout CTA */}
            <Button
              type="button"
              size="lg"
              className="w-full h-12 text-sm font-semibold"
              disabled={cart.length === 0}
              onClick={openPaymentDialog}
            >
              Proceed to Payment (F4) · {formatINR(totals.grandTotal)}
            </Button>
          </div>
        </div>
      </div>

      {/* Checkout Confirmation & Payment Modal (F4) */}
      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Confirm Simulated Checkout"
        subtitle={`${totalItemUnits} unit(s) across ${cart.length} line item(s) · Prototype simulation only`}
        maxWidthClass="max-w-lg"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setPaymentModalOpen(false)}>
              Back to Cart (Esc)
            </Button>
            <Button type="submit" form="pos-checkout-form" size="lg">
              <CheckCircle2 className="h-4 w-4" />
              Confirm &amp; Generate Receipt
            </Button>
          </>
        }
      >
        <form id="pos-checkout-form" onSubmit={handleConfirmCheckout} className="space-y-4">
          {/* Bill Summary Strip */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-1.5 text-xs tabular-nums">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Subtotal</span>
              <span className="font-mono">{formatINR(totals.taxableValue)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount Applied</span>
                <span className="font-mono">-{formatINR(totals.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>GST (CGST {formatINR(totals.cgstAmount)} + SGST {formatINR(totals.sgstAmount)})</span>
              <span className="font-mono">{formatINR(totals.totalTax)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
              <span>Grand Total</span>
              <span className="font-mono">{formatINR(totals.grandTotal)}</span>
            </div>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Mobile Number (Optional)
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 98450 12345"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Payment Method inside Modal */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Payment Method (Simulated)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'UPI', label: 'UPI', icon: Smartphone },
                  { id: 'Cash', label: 'Cash', icon: Banknote },
                  { id: 'Card', label: 'Card', icon: CreditCard },
                ] as const
              ).map((mode) => {
                const Icon = mode.icon;
                const active = paymentMethod === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(mode.id);
                      setCheckoutError('');
                    }}
                    className={cn(
                      'flex h-11 items-center justify-center gap-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer',
                      active
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>

          {paymentMethod === 'Cash' ? (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cash Tendered (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm font-semibold tabular-nums focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 flex flex-col justify-center">
                  <span className="text-[11px] text-slate-500">Change to Return</span>
                  <span className="font-mono text-base font-bold text-emerald-700 tabular-nums">
                    {formatINR(changeDue)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickCashAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashTendered(amt.toFixed(2))}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-700 cursor-pointer tabular-nums"
                  >
                    {formatINR(amt, amt % 1 !== 0)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {paymentMethod === 'UPI'
                  ? 'Simulated UPI Transaction ID / UTR (Optional)'
                  : 'Simulated Card Last 4 Digits / Auth Code (Optional)'}
              </label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder={
                  paymentMethod === 'UPI' ? 'e.g. SIM-UPI-489120' : 'e.g. CARD-XXXX-4829'
                }
                className="h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}

          {checkoutError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {checkoutError}
            </p>
          )}
        </form>
      </Modal>

      <ReceiptModal sale={completedReceipt} onClose={() => setCompletedReceipt(null)} />

      <CameraScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          setScannerOpen(false);
          processScannedCode(code);
        }}
      />
    </div>
  );
}
