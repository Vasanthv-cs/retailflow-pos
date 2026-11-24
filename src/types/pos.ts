export type RouteId =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'barcode-labels'
  | 'categories'
  | 'inventory'
  | 'purchases'
  | 'suppliers'
  | 'sales'
  | 'returns'
  | 'reports'
  | 'employees'
  | 'settings';

export type PaymentMethod = 'Cash' | 'UPI' | 'Card';

export type SaleStatus = 'Completed' | 'Returned' | 'Partial Return';

export type StockMovementType =
  | 'Sale'
  | 'Purchase'
  | 'Adjustment'
  | 'Transfer'
  | 'Return';

export type PurchaseOrderStatus = 'Pending' | 'Ordered' | 'Received';

export type EmployeeRole =
  | 'Store Manager'
  | 'Head Cashier'
  | 'Cashier'
  | 'Inventory Clerk'
  | 'Accountant';

export interface Category {
  id: string;
  name: string;
  description: string;
  defaultGstRate: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  sku: string;
  barcode: string;
  hsnCode: string;
  categoryId: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  gstRate: number; // 0, 5, 12, 18, 28
  stock: number;
  lowStockThreshold: number;
  supplierId: string;
  location: string;
  status: 'Active' | 'Inactive';
  description?: string;
  imageUrl?: string;
}

export interface Inventory {
  productId: string;
  sku: string;
  productName: string;
  location: string;
  quantityOnHand: number;
  minimumStockLevel: number;
  unitCost: number;
  valuationCost: number;
  valuationRetail: number;
  stockStatus: 'Healthy' | 'Low Stock' | 'Out of Stock';
}

export interface Payment {
  id: string;
  referenceNumber: string;
  type: 'Sale' | 'Refund';
  linkedDocumentId: string;
  linkedDocumentNumber: string;
  method: PaymentMethod;
  amount: number;
  date: string;
  amountTendered?: number;
  changeDue?: number;
  simulated: true;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  city: string;
  address: string;
  paymentTerms: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  gstRate: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate: string;
  receivedDate?: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalAmount: number;
  notes?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  sellingPrice: number;
  purchasePrice: number;
  gstRate: number;
  quantity: number;
  maxStock: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  returnedQuantity: number;
  unitPrice: number;
  purchasePrice: number;
  gstRate: number;
  taxAmount: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string; // ISO string
  customerName: string;
  customerPhone?: string;
  cashierId: string;
  cashierName: string;
  items: SaleItem[];
  subtotal: number; // Taxable value before GST
  discountType: 'percent' | 'flat';
  discountValue: number;
  discountAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  taxAmount: number;
  totalAmount: number;
  estimatedProfit: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  amountTendered?: number;
  changeDue?: number;
  status: SaleStatus;
}

export interface ReturnItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitRefund: number;
  refundAmount: number;
  condition: 'Sellable' | 'Damaged';
}

export interface Return {
  id: string;
  returnNumber: string;
  saleId: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  processedBy: string;
  reason: string;
  notes?: string;
  refundMethod: PaymentMethod;
  refundReference: string;
  restockItems: boolean;
  items: ReturnItem[];
  totalRefund: number;
}

/** Alias preserved for backwards compatibility across modules */
export type ReturnRecord = Return;

export interface StockMovement {
  id: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  type: StockMovementType;
  quantityChange: number; // positive or negative
  previousStock: number;
  newStock: number;
  reference: string;
  performedBy: string;
  location?: string;
  note?: string;
}

export interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  role: EmployeeRole;
  email: string;
  phone: string;
  shift: 'Morning (7 AM - 3 PM)' | 'Evening (2 PM - 10 PM)' | 'Full Day (9 AM - 6 PM)';
  status: 'Active' | 'Inactive';
  joinedDate: string;
}

export interface StoreSettings {
  storeName: string;
  legalName: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  currencySymbol: string;
  receiptFooter: string;
  defaultLowStockThreshold: number;
  taxInclusivePricing: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'warning' | 'info' | 'success';
  targetRoute?: RouteId;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'info';
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  employeeCode: string;
}

export type BarcodeSource = 'barcode' | 'sku';

export type BarcodePrintLayout = 'thermal-roll' | 'a4-sheet';

export interface BarcodeLabelQueueItem {
  productId: string;
  quantity: number;
}

export interface BarcodeValidationResult {
  valid: boolean;
  sanitizedValue: string;
  error?: string;
}

export interface BarcodeLabelData {
  key: string;
  productId: string;
  copyIndex: number;
  copyCount: number;
  storeName: string;
  productName: string;
  sku: string;
  barcodeValue: string;
  source: BarcodeSource;
  sellingPrice: number;
  formattedPrice: string;
  unit: string;
  svgMarkup: string | null;
  valid: boolean;
  error?: string;
}
