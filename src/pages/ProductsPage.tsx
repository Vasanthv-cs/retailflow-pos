import React, { useMemo, useState } from 'react';
import {
  Barcode,
  Check,
  Eye,
  FileSpreadsheet,
  Pencil,
  Plus,
  Power,
  Search,
  Upload,
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import { Modal } from '@/src/components/ui/Modal';
import { ProductThumbnail } from '@/src/components/ui/ProductThumbnail';
import { usePOS } from '@/src/hooks/usePOS';
import { formatINR } from '@/src/utils/format';
import { cn } from '@/src/utils/cn';
import type { Product } from '@/src/types/pos';

interface ProductFormState {
  name: string;
  brand: string;
  sku: string;
  barcode: string;
  hsnCode: string;
  categoryId: string;
  unit: string;
  purchasePrice: string;
  sellingPrice: string;
  gstRate: string;
  stock: string;
  lowStockThreshold: string;
  supplierId: string;
  location: string;
  description: string;
  imageUrl: string;
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  brand: '',
  sku: '',
  barcode: '',
  hsnCode: '',
  categoryId: '',
  unit: 'Pack',
  purchasePrice: '',
  sellingPrice: '',
  gstRate: '5',
  stock: '0',
  lowStockThreshold: '12',
  supplierId: '',
  location: 'Main Store Floor',
  description: '',
  imageUrl: '',
};

const GST_SLABS = [0, 5, 12, 18, 28];
const LOCATIONS = ['Main Store Floor', 'Backroom Warehouse', 'Cold Storage'];

const SAMPLE_CSV = `name,brand,sku,barcode,category,unit,purchasePrice,sellingPrice,gstRate,stock,minStock
Himalayan Rock Salt 1kg,Vindhya Farms,GRN-1091,890100100191,Grains & Staples,Pack,68,92,0,35,10
Mysore Filter Roast 500g,Coorg Estate,BEV-4092,890100400492,Beverages,Pack,245,320,5,24,8
Lemon Dishwash Gel 750ml,SparkleMatic,HSH-7093,890100700793,Household Supplies,Bottle,112,155,18,18,10`;

interface ParsedCSVRow {
  rowNum: number;
  product?: Omit<Product, 'id'>;
  error?: string;
  rawName: string;
  rawSku: string;
}

export function ProductsPage() {
  const {
    products,
    categories,
    suppliers,
    settings,
    addProduct,
    updateProduct,
    toggleProductStatus,
    bulkImportProducts,
    openBarcodeLabelsForProducts,
  } = usePOS();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'low' | 'out'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Deactivate / Reactivate confirmation state
  const [confirmToggleProduct, setConfirmToggleProduct] = useState<Product | null>(null);

  // CSV Import modal state
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvError, setCsvError] = useState('');

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q);
      const matchCat = categoryFilter === 'all' || p.categoryId === categoryFilter;
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchStock =
        stockFilter === 'all'
          ? true
          : stockFilter === 'out'
          ? p.stock === 0
          : stockFilter === 'low'
          ? p.stock > 0 && p.stock <= p.lowStockThreshold
          : p.stock > p.lowStockThreshold;
      return matchQuery && matchCat && matchStatus && matchStock;
    });
  }, [products, search, categoryFilter, stockFilter, statusFilter]);

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? 'Uncategorized';
  const getSupplierName = (id: string) =>
    suppliers.find((s) => s.id === id)?.name ?? '—';

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      categoryId: categories[0]?.id ?? '',
      supplierId: suppliers[0]?.id ?? '',
      lowStockThreshold: String(settings.defaultLowStockThreshold),
    });
    setFormError('');
    setFormOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      brand: product.brand,
      sku: product.sku,
      barcode: product.barcode,
      hsnCode: product.hsnCode,
      categoryId: product.categoryId,
      unit: product.unit,
      purchasePrice: String(product.purchasePrice),
      sellingPrice: String(product.sellingPrice),
      gstRate: String(product.gstRate),
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
      supplierId: product.supplierId,
      location: product.location,
      description: product.description ?? '',
      imageUrl: product.imageUrl ?? '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const allFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.includes(p.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const visibleSet = new Set(filteredProducts.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      setSelectedIds((prev) =>
        Array.from(new Set([...prev, ...filteredProducts.map((p) => p.id)]))
      );
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const brand = form.brand.trim();
    const sku = form.sku.trim().toUpperCase();
    const barcode = form.barcode.trim();
    const purchasePrice = parseFloat(form.purchasePrice);
    const sellingPrice = parseFloat(form.sellingPrice);
    const gstRate = parseFloat(form.gstRate);
    const stock = parseInt(form.stock, 10);
    const lowStockThreshold = parseInt(form.lowStockThreshold, 10);

    if (!name) return setFormError('Product name is required.');
    if (!brand) return setFormError('Brand name is required.');
    if (!sku) return setFormError('SKU code is required.');
    if (!barcode) return setFormError('Barcode number is required.');
    if (!form.categoryId) return setFormError('Please select a category.');
    if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
      return setFormError('Purchase price must be greater than 0.');
    }
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      return setFormError('Selling price must be greater than 0.');
    }
    if (sellingPrice < purchasePrice) {
      return setFormError('Selling price cannot be lower than purchase price.');
    }
    if (Number.isNaN(stock) || stock < 0) {
      return setFormError('Stock quantity must be 0 or higher.');
    }
    if (Number.isNaN(lowStockThreshold) || lowStockThreshold < 0) {
      return setFormError('Minimum stock level must be 0 or higher.');
    }

    const duplicateSku = products.some(
      (p) => p.sku.toLowerCase() === sku.toLowerCase() && p.id !== editingId
    );
    if (duplicateSku) {
      return setFormError(`SKU "${sku}" is already assigned to another product.`);
    }

    const existing = editingId ? products.find((p) => p.id === editingId) : null;

    const payload: Omit<Product, 'id'> = {
      name,
      brand,
      sku,
      barcode,
      hsnCode: form.hsnCode.trim() || '2106',
      categoryId: form.categoryId,
      unit: form.unit.trim() || 'Pack',
      purchasePrice,
      sellingPrice,
      gstRate: Number.isFinite(gstRate) ? gstRate : 5,
      stock,
      lowStockThreshold,
      supplierId: form.supplierId || suppliers[0]?.id || '',
      location: form.location,
      status: existing?.status ?? 'Active',
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
    };

    if (editingId) {
      updateProduct(editingId, payload);
    } else {
      addProduct(payload);
    }
    setFormOpen(false);
  };

  // Parse CSV rows live for preview & validation
  const parsedCSVRows = useMemo<ParsedCSVRow[]>(() => {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length <= 1) return [];

    const existingSkus = new Set(products.map((p) => p.sku.toLowerCase()));
    const seenInBatch = new Set<string>();

    return lines.slice(1).map((line, index) => {
      const cols = line.split(',').map((c) => c.trim());
      const [
        rawName = '',
        rawBrand = '',
        rawSku = '',
        rawBarcode = '',
        rawCategory = '',
        rawUnit = 'Pack',
        rawPurchase = '',
        rawSelling = '',
        rawGst = '5',
        rawStock = '0',
        rawMin = '10',
      ] = cols;

      const rowNum = index + 2;
      const skuUpper = rawSku.toUpperCase();
      const purchase = parseFloat(rawPurchase);
      const selling = parseFloat(rawSelling);
      const gst = parseFloat(rawGst);
      const stock = parseInt(rawStock, 10);
      const minStock = parseInt(rawMin, 10);

      if (!rawName || !skuUpper || !rawBarcode) {
        return {
          rowNum,
          rawName: rawName || '(Missing name)',
          rawSku: skuUpper || '(Missing SKU)',
          error: 'Name, SKU, and Barcode are required.',
        };
      }
      if (existingSkus.has(skuUpper.toLowerCase()) || seenInBatch.has(skuUpper.toLowerCase())) {
        return {
          rowNum,
          rawName,
          rawSku: skuUpper,
          error: `Duplicate SKU "${skuUpper}".`,
        };
      }
      if (!Number.isFinite(purchase) || !Number.isFinite(selling) || selling < purchase) {
        return {
          rowNum,
          rawName,
          rawSku: skuUpper,
          error: 'Invalid purchase/selling price.',
        };
      }

      seenInBatch.add(skuUpper.toLowerCase());
      const matchedCat =
        categories.find((c) => c.name.toLowerCase() === rawCategory.toLowerCase()) ??
        categories[0];

      return {
        rowNum,
        rawName,
        rawSku: skuUpper,
        product: {
          name: rawName,
          brand: rawBrand || 'House Brand',
          sku: skuUpper,
          barcode: rawBarcode,
          hsnCode: '2106',
          categoryId: matchedCat?.id ?? 'cat-1',
          unit: rawUnit || 'Pack',
          purchasePrice: purchase,
          sellingPrice: selling,
          gstRate: Number.isFinite(gst) ? gst : 5,
          stock: Number.isNaN(stock) ? 0 : Math.max(0, stock),
          lowStockThreshold: Number.isNaN(minStock) ? 10 : Math.max(0, minStock),
          supplierId: suppliers[0]?.id ?? 'sup-1',
          location: 'Main Store Floor',
          status: 'Active',
        },
      };
    });
  }, [csvText, products, categories, suppliers]);

  const validCsvProducts = useMemo(
    () => parsedCSVRows.filter((r) => r.product).map((r) => r.product!),
    [parsedCSVRows]
  );

  const handleCSVFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ''));
      setCsvError('');
    };
    reader.readAsText(file);
  };

  const handleConfirmCSVImport = () => {
    if (validCsvProducts.length === 0) {
      setCsvError('No valid product rows found. Load the sample CSV or fix highlighted errors.');
      return;
    }
    bulkImportProducts(validCsvProducts);
    setCsvOpen(false);
    setCsvText('');
    setCsvError('');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Product Catalog
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage retail SKUs, product photos, barcodes, GST slabs, pricing, and bulk imports.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() =>
              openBarcodeLabelsForProducts(
                selectedIds.length > 0
                  ? selectedIds
                  : filteredProducts.slice(0, 4).map((p) => p.id)
              )
            }
          >
            <Barcode className="h-4 w-4 text-indigo-600" />
            {selectedIds.length > 0
              ? `Print Labels (${selectedIds.length})`
              : 'Barcode Labels'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setCsvError('');
              setCsvOpen(true);
            }}
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Contextual Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200/80 bg-indigo-50/60 px-4 py-2.5 text-xs">
          <span className="font-medium text-indigo-950 tabular-nums">
            {selectedIds.length} product(s) selected for batch label printing
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => openBarcodeLabelsForProducts(selectedIds)}
            >
              <Barcode className="h-3.5 w-3.5" />
              Print Thermal Labels ({selectedIds.length})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, SKU, or barcode..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) =>
              setStockFilter(e.target.value as 'all' | 'in' | 'low' | 'out')
            }
            aria-label="Filter by stock status"
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Stock Levels</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(['all', 'Active', 'Inactive'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'all' ? 'All' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="w-10 pl-5 pr-2 py-3">
                  <button
                    type="button"
                    onClick={toggleSelectAllFiltered}
                    aria-label="Select all visible products"
                    className={cn(
                      'flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors cursor-pointer',
                      allFilteredSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-300 bg-white hover:border-indigo-400'
                    )}
                  >
                    {allFilteredSelected && <Check className="h-3 w-3 stroke-[2.5]" />}
                  </button>
                </th>
                <th className="px-3 py-3">Product &amp; Brand</th>
                <th className="px-4 py-3">SKU / Barcode</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Purchase</th>
                <th className="px-4 py-3 text-right">Selling</th>
                <th className="px-4 py-3 text-right">GST</th>
                <th className="px-4 py-3 text-right">Stock / Min</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-10 text-center text-sm text-slate-500">
                    No products match the current search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOut = p.stock === 0;
                  const isLow = p.stock > 0 && p.stock <= p.lowStockThreshold;
                  const isInactive = p.status === 'Inactive';
                  const isSelected = selectedIds.includes(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        'hover:bg-slate-50/70 transition-colors',
                        isSelected && 'bg-indigo-50/30',
                        isInactive && 'opacity-60'
                      )}
                    >
                      <td className="pl-5 pr-2 py-3">
                        <button
                          type="button"
                          onClick={() => toggleSelectProduct(p.id)}
                          aria-label={`Select ${p.name}`}
                          className={cn(
                            'flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors cursor-pointer',
                            isSelected
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-300 bg-white hover:border-indigo-400'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[2.5]" />}
                        </button>
                      </td>
                      <td className="px-3 py-3">
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
                            <p className="text-xs text-slate-500 truncate">
                              {p.brand} · {p.unit}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <p className="font-medium text-slate-800">{p.sku}</p>
                        <p className="text-slate-400">{p.barcode}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {getCategoryName(p.categoryId)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {formatINR(p.purchasePrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatINR(p.sellingPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {p.gstRate}%
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <p
                          className={`font-mono text-xs font-semibold ${
                            isOut
                              ? 'text-red-600'
                              : isLow
                              ? 'text-amber-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {p.stock} / {p.lowStockThreshold}
                        </p>
                        <p
                          className={`text-[11px] ${
                            isOut
                              ? 'text-red-600'
                              : isLow
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">
                        <span
                          className={
                            isInactive ? 'text-slate-400' : 'text-emerald-700'
                          }
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => openBarcodeLabelsForProducts([p.id])}
                            title="Print 50×25mm barcode label"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer"
                          >
                            <Barcode className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailProduct(p)}
                            title="View details"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            title="Edit product"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmToggleProduct(p)}
                            title={isInactive ? 'Reactivate product' : 'Deactivate product'}
                            className={`rounded-md p-1.5 cursor-pointer ${
                              isInactive
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-400 hover:bg-red-50 hover:text-red-600'
                            }`}
                          >
                            <Power className="h-4 w-4" />
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

      {/* Add / Edit Product Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Edit Product' : 'Add New Product'}
        subtitle="Complete all required retail catalog, pricing, GST, and stock fields."
        maxWidthClass="max-w-2xl"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="product-form">
              {editingId ? 'Save Changes' : 'Create Product'}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Deccan Basmati Rice 5kg"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Brand *</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="e.g., Deccan Harvest"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">SKU Code *</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="GRN-1009"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs uppercase focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Barcode (EAN/UPC) *
              </label>
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="890100100199"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category *</label>
              <select
                value={form.categoryId}
                onChange={(e) => {
                  const nextCat = categories.find((c) => c.id === e.target.value);
                  setForm({
                    ...form,
                    categoryId: e.target.value,
                    gstRate: nextCat ? String(nextCat.defaultGstRate) : form.gstRate,
                  });
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Unit *</label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="Pack, Bag, Bottle, Jar"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Purchase Price (₹) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.purchasePrice}
                onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">GST Rate (%)</label>
              <select
                value={form.gstRate}
                onChange={(e) => setForm({ ...form, gstRate: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              >
                {GST_SLABS.map((slab) => (
                  <option key={slab} value={slab}>
                    {slab}% GST ({slab / 2}% CGST + {slab / 2}% SGST)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">HSN Code</label>
              <input
                type="text"
                value={form.hsnCode}
                onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                placeholder="1006"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Stock Quantity *
              </label>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Minimum Stock Level *
              </label>
              <input
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Supplier</label>
              <select
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
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
                Storage Location
              </label>
              <select
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Product Image URL (Optional)
              </label>
              <div className="flex items-center gap-3">
                <ProductThumbnail
                  src={form.imageUrl}
                  alt={form.name || 'Preview'}
                  categoryId={form.categoryId}
                  sku={form.sku}
                  size="sm"
                />
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="/src/assets/images/...jpg or leave blank for category icon fallback"
                  className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-xs font-mono text-slate-700 placeholder:font-sans focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {formError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </p>
          )}
        </form>
      </Modal>

      {/* Product Details Modal */}
      <Modal
        open={Boolean(detailProduct)}
        onClose={() => setDetailProduct(null)}
        title={detailProduct?.name ?? ''}
        subtitle={
          detailProduct
            ? `${detailProduct.brand} · ${detailProduct.sku} · Barcode ${detailProduct.barcode}`
            : ''
        }
        footer={
          detailProduct && (
            <>
              <Button variant="outline" onClick={() => setDetailProduct(null)}>
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const targetId = detailProduct.id;
                  setDetailProduct(null);
                  openBarcodeLabelsForProducts([targetId]);
                }}
              >
                <Barcode className="h-4 w-4 text-indigo-600" />
                Print Label
              </Button>
              <Button
                onClick={() => {
                  const target = detailProduct;
                  setDetailProduct(null);
                  openEditModal(target);
                }}
              >
                Edit Product
              </Button>
            </>
          )
        }
      >
        {detailProduct && (
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-4">
              <ProductThumbnail
                src={detailProduct.imageUrl}
                alt={detailProduct.name}
                categoryId={detailProduct.categoryId}
                sku={detailProduct.sku}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-mono text-slate-500">
                  {detailProduct.sku} · Barcode {detailProduct.barcode}
                </p>
                {detailProduct.description ? (
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                    {detailProduct.description}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">
                    No extended product description added.
                  </p>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs">
              <div>
                <dt className="text-slate-500">Brand</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{detailProduct.brand}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Catalog Status</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{detailProduct.status}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Category</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {getCategoryName(detailProduct.categoryId)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Primary Supplier</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {getSupplierName(detailProduct.supplierId)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Purchase Price</dt>
                <dd className="mt-0.5 font-mono font-medium text-slate-900 tabular-nums">
                  {formatINR(detailProduct.purchasePrice)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Selling Price</dt>
                <dd className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                  {formatINR(detailProduct.sellingPrice)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Unit Margin</dt>
                <dd className="mt-0.5 font-mono font-medium text-emerald-700 tabular-nums">
                  {formatINR(detailProduct.sellingPrice - detailProduct.purchasePrice)} (
                  {(
                    ((detailProduct.sellingPrice - detailProduct.purchasePrice) /
                      detailProduct.sellingPrice) *
                    100
                  ).toFixed(1)}
                  %)
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">GST Rate · HSN</dt>
                <dd className="mt-0.5 font-mono font-medium text-slate-900">
                  {detailProduct.gstRate}% · HSN {detailProduct.hsnCode}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Stock / Minimum Level</dt>
                <dd className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                  {detailProduct.stock} {detailProduct.unit} (Min {detailProduct.lowStockThreshold})
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Storage Location</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{detailProduct.location}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        title="Import Products via CSV"
        subtitle="Upload a .csv file or paste comma-separated rows to bulk-add SKUs into local catalog."
        maxWidthClass="max-w-3xl"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setCsvOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={validCsvProducts.length === 0}
              onClick={handleConfirmCSVImport}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Import {validCsvProducts.length} Valid Product(s)
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <div>
              <p className="font-medium text-slate-800">Expected CSV columns</p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                name,brand,sku,barcode,category,unit,purchasePrice,sellingPrice,gstRate,stock,minStock
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                Choose File
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCSVFileUpload}
                  className="hidden"
                />
              </label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setCsvText(SAMPLE_CSV);
                  setCsvError('');
                }}
              >
                Load Sample CSV
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              CSV Data (Header + Rows)
            </label>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setCsvError('');
              }}
              placeholder="Paste CSV lines here or click Load Sample CSV..."
              className="w-full rounded-lg border border-slate-200 p-3 font-mono text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {parsedCSVRows.length > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 flex justify-between">
                <span>Validation Preview ({parsedCSVRows.length} rows)</span>
                <span className="font-mono text-emerald-700">
                  {validCsvProducts.length} ready ·{' '}
                  {parsedCSVRows.length - validCsvProducts.length} errors
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedCSVRows.map((row) => (
                      <tr key={row.rowNum}>
                        <td className="px-3 py-2 font-mono text-slate-400">#{row.rowNum}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{row.rawName}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{row.rawSku}</td>
                        <td className="px-3 py-2">
                          {row.error ? (
                            <span className="text-red-600 font-medium">{row.error}</span>
                          ) : (
                            <span className="text-emerald-700 font-medium">
                              Valid · {formatINR(row.product!.sellingPrice)} · Stock{' '}
                              {row.product!.stock}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {csvError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {csvError}
            </p>
          )}
        </div>
      </Modal>

      {/* Deactivate / Reactivate Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(confirmToggleProduct)}
        onClose={() => setConfirmToggleProduct(null)}
        onConfirm={() => {
          if (confirmToggleProduct) {
            toggleProductStatus(confirmToggleProduct.id);
          }
        }}
        title={
          confirmToggleProduct?.status === 'Active'
            ? 'Deactivate Product?'
            : 'Reactivate Product?'
        }
        description={
          confirmToggleProduct?.status === 'Active'
            ? `"${confirmToggleProduct.name}" (${confirmToggleProduct.sku}) will be hidden from the POS billing terminal while preserving its sales and stock history.`
            : `"${confirmToggleProduct?.name}" (${confirmToggleProduct?.sku}) will become available again on the POS billing terminal.`
        }
        confirmLabel={
          confirmToggleProduct?.status === 'Active' ? 'Deactivate Product' : 'Reactivate Product'
        }
        variant={confirmToggleProduct?.status === 'Active' ? 'destructive' : 'primary'}
      />
    </div>
  );
}
