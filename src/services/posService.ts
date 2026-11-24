import {
  INITIAL_CATEGORIES,
  INITIAL_EMPLOYEES,
  INITIAL_NOTIFICATIONS,
  INITIAL_PRODUCTS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_RETURNS,
  INITIAL_SALES,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_STORE_SETTINGS,
  INITIAL_SUPPLIERS,
} from '@/src/data/seedData';
import { apiClient } from '@/src/services/apiClient';
import type {
  AuthUser,
  Category,
  Employee,
  Inventory,
  NotificationItem,
  Payment,
  Product,
  PurchaseOrder,
  Return,
  Sale,
  StockMovement,
  StoreSettings,
  Supplier,
} from '@/src/types/pos';

/**
 * Contract for RetailFlow POS data access.
 * Backed by mock seed data for standalone frontend previews, with
 * a ready-to-use live API service that queries Spring Boot REST endpoints.
 */
export interface POSDataSnapshot {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  sales: Sale[];
  returns: Return[];
  payments: Payment[];
  stockMovements: StockMovement[];
  employees: Employee[];
  settings: StoreSettings;
  notifications: NotificationItem[];
}

export function deriveInitialPayments(sales: Sale[], returns: Return[]): Payment[] {
  const salePayments: Payment[] = sales.map((s) => ({
    id: `pay-${s.id}`,
    referenceNumber: s.paymentReference ?? `CASH-${s.invoiceNumber}`,
    type: 'Sale',
    linkedDocumentId: s.id,
    linkedDocumentNumber: s.invoiceNumber,
    method: s.paymentMethod,
    amount: s.totalAmount,
    date: s.date,
    amountTendered: s.amountTendered,
    changeDue: s.changeDue,
    simulated: true,
  }));

  const refundPayments: Payment[] = returns.map((r) => ({
    id: `pay-${r.id}`,
    referenceNumber: r.refundReference,
    type: 'Refund',
    linkedDocumentId: r.id,
    linkedDocumentNumber: r.returnNumber,
    method: r.refundMethod,
    amount: r.totalRefund,
    date: r.date,
    simulated: true,
  }));

  return [...refundPayments, ...salePayments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function deriveInventoryRecords(products: Product[]): Inventory[] {
  return products.map((p) => ({
    productId: p.id,
    sku: p.sku,
    productName: p.name,
    location: p.location,
    quantityOnHand: p.stock,
    minimumStockLevel: p.lowStockThreshold,
    unitCost: p.purchasePrice,
    valuationCost: p.stock * p.purchasePrice,
    valuationRetail: p.stock * p.sellingPrice,
    stockStatus:
      p.stock === 0
        ? 'Out of Stock'
        : p.stock <= p.lowStockThreshold
        ? 'Low Stock'
        : 'Healthy',
  }));
}

export const posMockService = {
  /** GET /api/v1/bootstrap */
  getInitialSnapshot(): POSDataSnapshot {
    const payments = deriveInitialPayments(INITIAL_SALES, INITIAL_RETURNS);
    return {
      products: INITIAL_PRODUCTS,
      categories: INITIAL_CATEGORIES,
      suppliers: INITIAL_SUPPLIERS,
      purchaseOrders: INITIAL_PURCHASE_ORDERS,
      sales: INITIAL_SALES,
      returns: INITIAL_RETURNS,
      payments,
      stockMovements: INITIAL_STOCK_MOVEMENTS,
      employees: INITIAL_EMPLOYEES,
      settings: INITIAL_STORE_SETTINGS,
      notifications: INITIAL_NOTIFICATIONS,
    };
  },

  /** Endpoint map documented for Spring Boot controller integration */
  endpoints: {
    authLogin: '/auth/login',
    authMe: '/auth/me',
    products: '/products',
    barcodeLabels: '/barcode-labels',
    categories: '/categories',
    inventory: '/inventory',
    inventoryValuation: '/inventory/valuation',
    stockMovements: '/inventory/movements',
    suppliers: '/suppliers',
    purchaseOrders: '/purchase-orders',
    sales: '/sales',
    checkout: '/sales/checkout',
    returns: '/returns',
    payments: '/payments',
    employees: '/employees',
    settings: '/store/settings',
    reportsSummary: '/reports/summary',
    reportsGstr1: '/reports/gstr1',
    reportsDailyTrends: '/reports/daily-trends',
    reportsByCategory: '/reports/by-category',
    reportsByProduct: '/reports/by-product',
    reportsPaymentSummary: '/reports/payment-summary',
  } as const,
};

export interface InventoryValuationSummary {
  totalCostValuation: number;
  totalRetailValuation: number;
  potentialProfit: number;
  totalProducts: number;
  totalUnitsInStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  healthyStockCount: number;
}

export interface PaginatedResult<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    employeeCode: string;
    storeId: string;
  };
}

// -------------------------------------------------------------
// Stage 8: Centralized Typed Modular API Services
// -------------------------------------------------------------

export const authService = {
  login: (payload: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/auth/login', payload),
  getMe: () => apiClient.get<AuthResponse['user']>('/auth/me'),
  logout: () => apiClient.post<void>('/auth/logout'),
  changePassword: (payload: { oldPassword: string; newPassword: string }) =>
    apiClient.post<void>('/auth/change-password', payload),
};

export const productService = {
  getAll: (query?: string, categoryId?: string, storeId?: string) => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (categoryId && categoryId !== 'all') params.append('categoryId', categoryId);
    if (storeId) params.append('storeId', storeId);
    const qs = params.toString();
    return apiClient.get<Product[]>(`/products${qs ? `?${qs}` : ''}`);
  },

  getPaginated: (params: {
    query?: string;
    categoryId?: string;
    storeId?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.append('query', params.query);
    if (params.categoryId && params.categoryId !== 'all') searchParams.append('categoryId', params.categoryId);
    if (params.storeId) searchParams.append('storeId', params.storeId);
    if (params.page !== undefined) searchParams.append('page', params.page.toString());
    if (params.size !== undefined) searchParams.append('size', params.size.toString());
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.direction) searchParams.append('direction', params.direction);
    const qs = searchParams.toString();
    return apiClient.get<PaginatedResult<Product>>(`/products/paginated${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) => apiClient.get<Product>(`/products/${id}`),
  getByBarcode: (code: string) => apiClient.get<Product>(`/products/by-barcode/${code}`),
  getLowStock: (storeId?: string) => {
    const qs = storeId ? `?storeId=${storeId}` : '';
    return apiClient.get<Product[]>(`/products/low-stock${qs}`);
  },
  create: (product: Partial<Product>) => apiClient.post<Product>('/products', product),
  update: (id: string, product: Partial<Product>) => apiClient.put<Product>(`/products/${id}`, product),
  delete: (id: string) => apiClient.delete<void>(`/products/${id}`),
};

export const categoryService = {
  getAll: () => apiClient.get<Category[]>('/categories'),
  create: (cat: Partial<Category>) => apiClient.post<Category>('/categories', cat),
  update: (id: string, cat: Partial<Category>) => apiClient.put<Category>(`/categories/${id}`, cat),
  delete: (id: string) => apiClient.delete<void>(`/categories/${id}`),
};

export const inventoryService = {
  getRecords: (storeId?: string) => {
    const qs = storeId ? `?storeId=${storeId}` : '';
    return apiClient.get<Inventory[]>(`/inventory${qs}`);
  },
  getValuation: (storeId?: string) => {
    const qs = storeId ? `?storeId=${storeId}` : '';
    return apiClient.get<InventoryValuationSummary>(`/inventory/valuation${qs}`);
  },
  adjustStock: (payload: { productId: string; delta: number; reason: string; performedBy?: string }) =>
    apiClient.post<Product>('/inventory/adjust', payload),
  transferStock: (payload: { productId: string; toLocation: string; quantity: number; note?: string; performedBy?: string }) =>
    apiClient.post<Product>('/inventory/transfer', payload),
  getMovements: (productId?: string) => {
    const qs = productId ? `?productId=${productId}` : '';
    return apiClient.get<StockMovement[]>(`/inventory/movements${qs}`);
  },
};

export const supplierService = {
  getAll: (query?: string) => {
    const qs = query ? `?query=${encodeURIComponent(query)}` : '';
    return apiClient.get<Supplier[]>(`/suppliers${qs}`);
  },
  getById: (id: string) => apiClient.get<Supplier>(`/suppliers/${id}`),
  getPurchaseHistory: (supplierId: string) =>
    apiClient.get<PurchaseOrder[]>(`/suppliers/${supplierId}/purchase-history`),
  create: (supplier: Partial<Supplier>) => apiClient.post<Supplier>('/suppliers', supplier),
  update: (id: string, supplier: Partial<Supplier>) => apiClient.put<Supplier>(`/suppliers/${id}`, supplier),
};

export const purchaseOrderService = {
  getAll: (status?: string) => {
    const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return apiClient.get<PurchaseOrder[]>(`/purchase-orders${qs}`);
  },
  getById: (id: string) => apiClient.get<PurchaseOrder>(`/purchase-orders/${id}`),
  create: (po: {
    supplierId: string;
    expectedDate: string;
    notes?: string;
    status?: string;
    items: Array<{ productId: string; quantity: number; unitCost: number; gstRate: number }>;
  }) => apiClient.post<PurchaseOrder>('/purchase-orders', po),
  receive: (
    poId: string,
    payload?: { receivedBy?: string; items?: Array<{ productId: string; quantityReceived: number }> }
  ) => apiClient.post<PurchaseOrder>(`/purchase-orders/${poId}/receive`, payload ?? {}),
  cancel: (id: string) => apiClient.patch<PurchaseOrder>(`/purchase-orders/${id}/cancel`),
};

export const salesService = {
  checkout: (payload: unknown) => apiClient.post<Sale>('/sales/checkout', payload),
  getAll: (startDate?: string, endDate?: string, cashierId?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (cashierId) params.append('cashierId', cashierId);
    const qs = params.toString();
    return apiClient.get<Sale[]>(`/sales${qs ? `?${qs}` : ''}`);
  },
  getPaginated: (page = 0, size = 20) =>
    apiClient.get<PaginatedResult<Sale>>(`/sales/paginated?page=${page}&size=${size}`),
  getById: (id: string) => apiClient.get<Sale>(`/sales/${id}`),
  getByInvoice: (invoiceNumber: string) => apiClient.get<Sale>(`/sales/by-invoice/${encodeURIComponent(invoiceNumber)}`),
};

export const returnService = {
  processReturn: (payload: unknown) => apiClient.post<Return>('/returns', payload),
  getAll: () => apiClient.get<Return[]>('/returns'),
  getById: (id: string) => apiClient.get<Return>(`/returns/${id}`),
  getByInvoice: (invoiceNumber: string) =>
    apiClient.get<Return[]>(`/returns/by-invoice/${encodeURIComponent(invoiceNumber)}`),
};

export const reportService = {
  getSummary: () => apiClient.get<unknown>('/reports/summary'),
  getDateRangeSummary: (startDate: string, endDate: string) =>
    apiClient.get<unknown>(`/reports/summary-by-date?startDate=${startDate}&endDate=${endDate}`),
  getGstr1: () => apiClient.get<unknown[]>('/reports/gstr1'),
  getDailyTrends: () => apiClient.get<unknown[]>('/reports/daily-trends'),
  getByCategory: () => apiClient.get<unknown[]>('/reports/by-category'),
  getByProduct: () => apiClient.get<unknown[]>('/reports/by-product'),
  getPaymentSummary: () => apiClient.get<unknown[]>('/reports/payment-summary'),
  getPurchasesSummary: () => apiClient.get<unknown>('/reports/purchases-summary'),
  getReturnsSummary: () => apiClient.get<unknown>('/reports/returns-summary'),
};

/**
 * Live Spring Boot API client service aggregation.
 * Connects directly to Spring Boot REST endpoints with JWT Bearer authentication.
 */
export const livePosService = {
  // Auth
  auth: authService,

  // Catalog & Products
  getProducts: productService.getAll,
  getPaginatedProducts: productService.getPaginated,
  getProductById: productService.getById,
  getProductByBarcode: productService.getByBarcode,
  getLowStockProducts: productService.getLowStock,
  createProduct: productService.create,
  updateProduct: productService.update,
  deleteProduct: productService.delete,

  // Categories
  getCategories: categoryService.getAll,
  createCategory: categoryService.create,
  updateCategory: categoryService.update,
  deleteCategory: categoryService.delete,

  // Inventory
  getInventory: inventoryService.getRecords,
  getInventoryValuation: inventoryService.getValuation,
  adjustStock: inventoryService.adjustStock,
  transferStock: inventoryService.transferStock,
  getStockMovements: inventoryService.getMovements,

  // Suppliers
  getSuppliers: supplierService.getAll,
  getSupplierById: supplierService.getById,
  getSupplierPurchaseHistory: supplierService.getPurchaseHistory,
  createSupplier: supplierService.create,
  updateSupplier: supplierService.update,

  // Purchases
  getPurchaseOrders: purchaseOrderService.getAll,
  getPurchaseOrderById: purchaseOrderService.getById,
  createPurchaseOrder: purchaseOrderService.create,
  receiveGoods: purchaseOrderService.receive,
  cancelPurchaseOrder: purchaseOrderService.cancel,

  // Sales & Checkout
  getSales: salesService.getAll,
  getPaginatedSales: salesService.getPaginated,
  getSaleById: salesService.getById,
  getSaleByInvoice: salesService.getByInvoice,
  checkout: salesService.checkout,

  // Returns & Refunds
  getReturns: returnService.getAll,
  getReturnById: returnService.getById,
  getReturnsByInvoice: returnService.getByInvoice,
  processReturn: returnService.processReturn,

  // Reports
  reports: reportService,

  // Store Settings
  getStoreSettings: () => apiClient.get<StoreSettings>('/store/settings'),
  getPayments: () => apiClient.get<Payment[]>('/payments'),
};

export interface BarcodePrintBatchLog {
  batchId: string;
  printedAt: string;
  totalLabels: number;
  productIds: string[];
  layout: 'thermal-roll' | 'a4-sheet';
}

export const barcodeLabelService = {
  /** POST /api/v1/barcode-labels/print-batches (ready for Spring Boot integration) */
  logPrintBatch(
    productIds: string[],
    totalLabels: number,
    layout: 'thermal-roll' | 'a4-sheet'
  ): BarcodePrintBatchLog {
    return {
      batchId: `LBL-${Date.now().toString(36).toUpperCase()}`,
      printedAt: new Date().toISOString(),
      totalLabels,
      productIds,
      layout,
    };
  },
};
