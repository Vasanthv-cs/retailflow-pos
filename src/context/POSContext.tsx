import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  authService,
  deriveInventoryRecords,
  livePosService,
  posMockService,
  returnService,
  salesService,
} from '@/src/services/posService';
import { getApiAuthToken, setApiAuthToken } from '@/src/services/apiClient';
import { realtimeClient } from '@/src/services/realtimeClient';
import { calculateCartTotals, round2 } from '@/src/utils/format';
import type {
  AuthUser,
  BarcodeLabelQueueItem,
  CartItem,
  Category,
  Employee,
  Inventory,
  NotificationItem,
  Payment,
  PaymentMethod,
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  Return,
  ReturnItem,
  RouteId,
  Sale,
  SaleItem,
  StockMovement,
  StoreSettings,
  Supplier,
  ToastMessage,
} from '@/src/types/pos';

interface CheckoutPayload {
  items: CartItem[];
  discountType: 'percent' | 'flat';
  discountValue: number;
  customerName: string;
  customerPhone?: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  amountTendered?: number;
}

export interface ProcessReturnPayload {
  saleId: string;
  items: { productId: string; quantity: number; condition: 'Sellable' | 'Damaged' }[];
  reason: string;
  notes?: string;
  refundMethod: PaymentMethod;
}

interface POSContextValue {
  user: AuthUser | null;
  activeRoute: RouteId;
  setActiveRoute: (route: RouteId) => void;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginAsRole: (role: 'manager' | 'cashier') => void;
  logout: () => void;

  products: Product[];
  inventory: Inventory[];
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
  toasts: ToastMessage[];

  addToast: (title: string, variant?: ToastMessage['variant'], description?: string) => void;
  dismissToast: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  completeSale: (payload: CheckoutPayload) => { ok: boolean; sale?: Sale; error?: string };

  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => void;
  toggleProductStatus: (id: string) => void;
  bulkImportProducts: (items: Omit<Product, 'id'>[]) => number;
  deleteProduct: (id: string) => void;

  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Omit<Category, 'id'>>) => void;
  deleteCategory: (id: string) => { ok: boolean; error?: string };

  adjustStock: (productId: string, delta: number, reason: string) => void;
  transferStock: (productId: string, toLocation: string, quantity: number, note: string) => void;

  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, updates: Partial<Omit<Supplier, 'id'>>) => void;

  createPurchaseOrder: (payload: {
    supplierId: string;
    expectedDate: string;
    items: PurchaseOrderItem[];
    notes?: string;
  }) => void;
  receivePurchaseOrder: (poId: string) => void;

  processReturn: (
    payload: ProcessReturnPayload
  ) => { ok: boolean; returnRecord?: Return; error?: string };

  addEmployee: (emp: Omit<Employee, 'id'>) => void;
  updateEmployee: (id: string, updates: Partial<Omit<Employee, 'id'>>) => void;
  toggleEmployeeStatus: (id: string) => void;

  updateSettings: (updates: StoreSettings) => void;

  barcodeLabelQueue: BarcodeLabelQueueItem[];
  setBarcodeLabelQueue: React.Dispatch<React.SetStateAction<BarcodeLabelQueueItem[]>>;
  openBarcodeLabelsForProducts: (productIds: string[]) => void;

  lowStockProducts: Product[];
}

const POSContext = createContext<POSContextValue | null>(null);

let idCounter = 100;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export function POSProvider({ children }: { children: React.ReactNode }) {
  const initialSnapshot = useMemo(() => posMockService.getInitialSnapshot(), []);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteId>('dashboard');

  const [products, setProducts] = useState<Product[]>(initialSnapshot.products);
  const [categories, setCategories] = useState<Category[]>(initialSnapshot.categories);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSnapshot.suppliers);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(
    initialSnapshot.purchaseOrders
  );
  const [sales, setSales] = useState<Sale[]>(initialSnapshot.sales);
  const [returns, setReturns] = useState<Return[]>(initialSnapshot.returns);
  const [payments, setPayments] = useState<Payment[]>(initialSnapshot.payments);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(
    initialSnapshot.stockMovements
  );
  const [employees, setEmployees] = useState<Employee[]>(initialSnapshot.employees);
  const [settings, setSettings] = useState<StoreSettings>(initialSnapshot.settings);
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    initialSnapshot.notifications
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [barcodeLabelQueue, setBarcodeLabelQueue] = useState<BarcodeLabelQueueItem[]>([
    { productId: 'prod-1', quantity: 2 },
    { productId: 'prod-7', quantity: 2 },
    { productId: 'prod-10', quantity: 1 },
  ]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (title: string, variant: ToastMessage['variant'] = 'success', description?: string) => {
      const id = nextId('toast');
      setToasts((prev) => [...prev.slice(-3), { id, title, description, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  const pushNotification = useCallback(
    (title: string, message: string, type: NotificationItem['type'], targetRoute?: RouteId) => {
      setNotifications((prev) => [
        {
          id: nextId('notif'),
          title,
          message,
          timestamp: new Date().toISOString(),
          read: false,
          type,
          targetRoute,
        },
        ...prev,
      ]);
    },
    []
  );

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Restore authenticated session via HttpOnly cookie or in-memory token
  React.useEffect(() => {
    if (!import.meta.env.VITE_API_BASE_URL) return;
    let cancelled = false;
    authService
      .getMe()
      .then((me) => {
        if (cancelled) return;
        const roleMap: Record<string, AuthUser['role']> = {
          ADMIN: 'Store Manager',
          MANAGER: 'Store Manager',
          CASHIER: 'Head Cashier',
          INVENTORY_STAFF: 'Inventory Clerk',
          ACCOUNTANT: 'Accountant',
        };
        const mappedRole = roleMap[me.role?.toUpperCase()] ?? 'Store Manager';
        setUser({
          id: me.id,
          name: me.name,
          email: me.email,
          role: mappedRole,
          employeeCode: me.employeeCode,
        });
        setActiveRoute(mappedRole === 'Head Cashier' ? 'pos' : 'dashboard');
      })
      .catch(() => {
        if (!cancelled) {
          setApiAuthToken(null);
          setUser(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Real-time synchronization across cashiers and browser sessions (Stage 9)
  React.useEffect(() => {
    if (!user || !import.meta.env.VITE_API_BASE_URL) return;
    realtimeClient.connect('store-1');

    const unsubInventory = realtimeClient.on<any>('INVENTORY_UPDATE', (payload) => {
      if (!payload || !payload.productId) return;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === payload.productId
            ? { ...p, stock: payload.newStockOnHand }
            : p
        )
      );
    });

    const unsubSale = realtimeClient.on<any>('NEW_SALE', (payload) => {
      if (!payload || !payload.invoiceNumber) return;
      pushNotification(
        `Live Sale ${payload.invoiceNumber}`,
        `Billed ₹${payload.totalAmount} by Cashier (${payload.cashierId})`,
        'success',
        'sales'
      );
    });

    const unsubLowStock = realtimeClient.on<any>('LOW_STOCK_ALERT', (payload) => {
      if (!payload) return;
      pushNotification(
        `Low Stock Alert: ${payload.productName}`,
        `Only ${payload.stockOnHand} unit(s) left in stock. Reorder required.`,
        'warning',
        'inventory'
      );
    });

    const unsubPO = realtimeClient.on<any>('PURCHASE_ORDER_UPDATE', (payload) => {
      if (!payload || !payload.poNumber) return;
      pushNotification(
        `Purchase Order ${payload.poNumber}`,
        `${payload.supplierName} status updated to ${payload.status}`,
        'info',
        'purchases'
      );
      setPurchaseOrders((prev) =>
        prev.map((po) =>
          po.id === payload.poId || po.poNumber === payload.poNumber
            ? { ...po, status: payload.status === 'RECEIVED' ? 'Received' : 'Ordered' }
            : po
        )
      );
    });

    return () => {
      unsubInventory();
      unsubSale();
      unsubLowStock();
      unsubPO();
      realtimeClient.disconnect();
    };
  }, [user, pushNotification]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        return { ok: false, error: 'Enter a valid store email address.' };
      }
      if (password.trim().length < 4) {
        return { ok: false, error: 'Password must be at least 4 characters.' };
      }

      if (import.meta.env.VITE_API_BASE_URL) {
        try {
          const auth = await authService.login({ email: trimmedEmail, password });
          setApiAuthToken(auth.accessToken);
          const roleMap: Record<string, AuthUser['role']> = {
            ADMIN: 'Store Manager',
            MANAGER: 'Store Manager',
            CASHIER: 'Head Cashier',
            INVENTORY_STAFF: 'Inventory Clerk',
            ACCOUNTANT: 'Accountant',
          };
          const mappedRole = roleMap[auth.user.role?.toUpperCase()] ?? 'Store Manager';
          setUser({
            id: auth.user.id,
            name: auth.user.name,
            email: auth.user.email,
            role: mappedRole,
            employeeCode: auth.user.employeeCode,
          });
          setActiveRoute(mappedRole === 'Head Cashier' ? 'pos' : 'dashboard');
          addToast('Signed in to RetailFlow POS', 'success', `Welcome back, ${auth.user.name}.`);
          return { ok: true };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unable to sign in.';
          if (message.includes('API 401') || message.includes('API 403') || message.includes('API 400')) {
            return { ok: false, error: 'Invalid email or password.' };
          }
          return { ok: false, error: message };
        }
      }

      const matched = employees.find(
        (e) => e.email.toLowerCase() === trimmedEmail && e.status === 'Active'
      );
      if (matched) {
        setUser({
          id: matched.id,
          name: matched.name,
          email: matched.email,
          role: matched.role,
          employeeCode: matched.employeeCode,
        });
      } else {
        setUser({
          id: 'emp-1',
          name: 'Arvind Subramanian',
          email: trimmedEmail,
          role: 'Store Manager',
          employeeCode: 'RF-101',
        });
      }
      setActiveRoute('dashboard');
      addToast('Signed in to RetailFlow POS', 'success', 'Local workspace session started.');
      return { ok: true };
    },
    [employees, addToast]
  );

  const loginAsRole = useCallback(
    (role: 'manager' | 'cashier') => {
      const target =
        role === 'manager'
          ? employees[0]
          : employees.find((e) => e.role === 'Head Cashier') || employees[1];
      setUser({
        id: target.id,
        name: target.name,
        email: target.email,
        role: target.role,
        employeeCode: target.employeeCode,
      });
      setActiveRoute(role === 'cashier' ? 'pos' : 'dashboard');
      addToast(`Signed in as ${target.name}`, 'success', `Role: ${target.role}`);
    },
    [employees, addToast]
  );

  const logout = useCallback(() => {
    if (import.meta.env.VITE_API_BASE_URL) {
      authService.logout().catch(() => {});
    }
    realtimeClient.disconnect();
    setApiAuthToken(null);
    setUser(null);
    setNotifications([]);
    addToast('Signed out', 'info', 'Cashier terminal locked.');
  }, [addToast]);

  const completeSale = useCallback(
    (payload: CheckoutPayload): { ok: boolean; sale?: Sale; error?: string } => {
      if (payload.items.length === 0) {
        return { ok: false, error: 'Cart is empty. Add at least one item before checkout.' };
      }

      for (const item of payload.items) {
        const currentProd = products.find((p) => p.id === item.productId);
        if (!currentProd || currentProd.status !== 'Active') {
          return { ok: false, error: `${item.name} is no longer available for sale.` };
        }
        if (item.quantity > currentProd.stock) {
          return {
            ok: false,
            error: `Insufficient stock for ${currentProd.name} (${currentProd.stock} left).`,
          };
        }
      }

      const calc = calculateCartTotals(
        payload.items,
        payload.discountType,
        payload.discountValue,
        settings.taxInclusivePricing
      );

      if (payload.paymentMethod === 'Cash') {
        const tendered = payload.amountTendered ?? calc.grandTotal;
        if (tendered + 0.009 < calc.grandTotal) {
          return { ok: false, error: 'Cash tendered cannot be less than the invoice total.' };
        }
      }

      const nextSeq = 1049 + (sales.length - initialSnapshot.sales.length);
      const invoiceNumber = `INV-2026-${nextSeq}`;
      const nowIso = new Date().toISOString();
      const cashierName = user?.name ?? 'Meenakshi Rao';
      const cashierId = user?.id ?? 'emp-2';

      const discountRatio =
        calc.grossSubtotal > 0 ? calc.discountAmount / calc.grossSubtotal : 0;

      const saleItems: SaleItem[] = payload.items.map((ci) => {
        const lineGross = ci.sellingPrice * ci.quantity;
        const discounted = lineGross * (1 - discountRatio);
        let taxAmount = 0;
        let lineTotal = 0;
        if (settings.taxInclusivePricing) {
          const base = discounted / (1 + ci.gstRate / 100);
          taxAmount = round2(discounted - base);
          lineTotal = round2(discounted);
        } else {
          taxAmount = round2((discounted * ci.gstRate) / 100);
          lineTotal = round2(discounted + taxAmount);
        }
        return {
          productId: ci.productId,
          productName: ci.name,
          sku: ci.sku,
          quantity: ci.quantity,
          returnedQuantity: 0,
          unitPrice: ci.sellingPrice,
          purchasePrice: ci.purchasePrice,
          gstRate: ci.gstRate,
          taxAmount,
          lineTotal,
        };
      });

      const paymentRef =
        payload.paymentMethod === 'UPI'
          ? payload.paymentReference?.trim() ||
            `SIM-UPI-${Math.floor(100000 + Math.random() * 900000)}`
          : payload.paymentMethod === 'Card'
          ? payload.paymentReference?.trim() ||
            `SIM-CARD-${Math.floor(1000 + Math.random() * 9000)}`
          : undefined;

      const saleId = nextId('sale');
      const newSale: Sale = {
        id: saleId,
        invoiceNumber,
        date: nowIso,
        customerName: payload.customerName.trim() || 'Walk-in Customer',
        customerPhone: payload.customerPhone?.trim() || undefined,
        cashierId,
        cashierName,
        items: saleItems,
        subtotal: calc.taxableValue,
        discountType: payload.discountType,
        discountValue: payload.discountValue,
        discountAmount: calc.discountAmount,
        cgstAmount: calc.cgstAmount,
        sgstAmount: calc.sgstAmount,
        taxAmount: calc.totalTax,
        totalAmount: calc.grandTotal,
        estimatedProfit: calc.estimatedProfit,
        paymentMethod: payload.paymentMethod,
        paymentReference: paymentRef,
        amountTendered:
          payload.paymentMethod === 'Cash'
            ? round2(payload.amountTendered ?? calc.grandTotal)
            : undefined,
        changeDue:
          payload.paymentMethod === 'Cash'
            ? round2(Math.max(0, (payload.amountTendered ?? calc.grandTotal) - calc.grandTotal))
            : undefined,
        status: 'Completed',
      };

      const newPayment: Payment = {
        id: nextId('pay'),
        referenceNumber: paymentRef ?? `CASH-${invoiceNumber}`,
        type: 'Sale',
        linkedDocumentId: saleId,
        linkedDocumentNumber: invoiceNumber,
        method: payload.paymentMethod,
        amount: calc.grandTotal,
        date: nowIso,
        amountTendered: newSale.amountTendered,
        changeDue: newSale.changeDue,
        simulated: true,
      };

      const newMovements: StockMovement[] = [];
      const newlyLowStock: string[] = [];

      setProducts((prev) =>
        prev.map((prod) => {
          const soldLine = payload.items.find((i) => i.productId === prod.id);
          if (!soldLine) return prod;
          const nextStock = Math.max(0, prod.stock - soldLine.quantity);
          if (nextStock <= prod.lowStockThreshold && prod.stock > prod.lowStockThreshold) {
            newlyLowStock.push(prod.name);
          }
          newMovements.push({
            id: nextId('mov'),
            date: nowIso,
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            type: 'Sale',
            quantityChange: -soldLine.quantity,
            previousStock: prod.stock,
            newStock: nextStock,
            reference: invoiceNumber,
            performedBy: cashierName,
            location: prod.location,
          });
          return { ...prod, stock: nextStock };
        })
      );

      setSales((prev) => [newSale, ...prev]);
      setPayments((prev) => [newPayment, ...prev]);
      setStockMovements((prev) => [...newMovements, ...prev]);

      // Stage 9: Broadcast real-time event across open browser sessions/tabs
      realtimeClient.broadcastLocally('NEW_SALE', {
        invoiceNumber,
        cashierId,
        totalAmount: newSale.totalAmount,
        itemCount: saleItems.length,
      });
      for (const item of saleItems) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          realtimeClient.broadcastLocally('INVENTORY_UPDATE', {
            productId: prod.id,
            sku: prod.sku,
            newStockOnHand: prod.stock - item.quantity,
          });
        }
      }

      pushNotification(
        `Simulated sale ${invoiceNumber}`,
        `${newSale.customerName} · ${newSale.paymentMethod} · ${saleItems.length} item(s)`,
        'success',
        'sales'
      );

      if (newlyLowStock.length > 0) {
        pushNotification(
          'Low stock triggered',
          `${newlyLowStock.join(', ')} dropped below threshold.`,
          'warning',
          'inventory'
        );
      }

      addToast(
        `Simulated checkout complete (${invoiceNumber})`,
        'success',
        'Inventory levels and dashboard metrics updated.'
      );

      return { ok: true, sale: newSale };
    },
    [
      products,
      sales.length,
      initialSnapshot.sales.length,
      settings.taxInclusivePricing,
      user,
      pushNotification,
      addToast,
    ]
  );

  const addProduct = useCallback(
    (product: Omit<Product, 'id'>) => {
      const created: Product = { ...product, id: nextId('prod') };
      setProducts((prev) => [created, ...prev]);
      if (created.stock > 0) {
        setStockMovements((prev) => [
          {
            id: nextId('mov'),
            date: new Date().toISOString(),
            productId: created.id,
            productName: created.name,
            sku: created.sku,
            type: 'Adjustment',
            quantityChange: created.stock,
            previousStock: 0,
            newStock: created.stock,
            reference: 'OPENING-STOCK',
            performedBy: user?.name ?? 'Store Manager',
            location: created.location,
            note: 'Initial opening stock on product creation',
          },
          ...prev,
        ]);
      }
      addToast('Product added', 'success', `${created.name} (${created.sku}) saved to catalog.`);
    },
    [user, addToast]
  );

  const updateProduct = useCallback(
    (id: string, updates: Partial<Omit<Product, 'id'>>) => {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
      addToast('Product updated', 'success', 'Catalog changes saved.');
    },
    [addToast]
  );

  const toggleProductStatus = useCallback(
    (id: string) => {
      const target = products.find((p) => p.id === id);
      if (!target) return;
      const nextStatus: Product['status'] =
        target.status === 'Active' ? 'Inactive' : 'Active';
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: nextStatus } : p))
      );
      addToast(
        nextStatus === 'Inactive' ? 'Product deactivated' : 'Product reactivated',
        nextStatus === 'Inactive' ? 'info' : 'success',
        `${target.name} is now ${nextStatus.toLowerCase()}.`
      );
    },
    [products, addToast]
  );

  const bulkImportProducts = useCallback(
    (items: Omit<Product, 'id'>[]): number => {
      if (items.length === 0) return 0;
      const nowIso = new Date().toISOString();
      const createdList: Product[] = items.map((item) => ({
        ...item,
        id: nextId('prod'),
      }));
      const movements: StockMovement[] = createdList
        .filter((p) => p.stock > 0)
        .map((p) => ({
          id: nextId('mov'),
          date: nowIso,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          type: 'Adjustment',
          quantityChange: p.stock,
          previousStock: 0,
          newStock: p.stock,
          reference: 'CSV-IMPORT',
          performedBy: user?.name ?? 'Store Manager',
          location: p.location,
          note: 'Opening stock added via CSV import',
        }));

      setProducts((prev) => [...createdList, ...prev]);
      if (movements.length > 0) {
        setStockMovements((prev) => [...movements, ...prev]);
      }
      addToast(
        `Imported ${createdList.length} product(s)`,
        'success',
        'Catalog and opening stock records updated.'
      );
      return createdList.length;
    },
    [user, addToast]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      const target = products.find((p) => p.id === id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      if (target) {
        addToast('Product removed', 'info', `${target.name} was deleted from catalog.`);
      }
    },
    [products, addToast]
  );

  const addCategory = useCallback(
    (category: Omit<Category, 'id'>) => {
      setCategories((prev) => [...prev, { ...category, id: nextId('cat') }]);
      addToast('Category created', 'success', `${category.name} is now available.`);
    },
    [addToast]
  );

  const updateCategory = useCallback(
    (id: string, updates: Partial<Omit<Category, 'id'>>) => {
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
      addToast('Category updated', 'success');
    },
    [addToast]
  );

  const deleteCategory = useCallback(
    (id: string) => {
      const assignedCount = products.filter((p) => p.categoryId === id).length;
      if (assignedCount > 0) {
        return {
          ok: false,
          error: `Cannot delete category while ${assignedCount} product(s) are assigned to it.`,
        };
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      addToast('Category deleted', 'info');
      return { ok: true };
    },
    [products, addToast]
  );

  const adjustStock = useCallback(
    (productId: string, delta: number, reason: string) => {
      const target = products.find((p) => p.id === productId);
      if (!target) return;
      const newStock = Math.max(0, target.stock + delta);
      const actualDelta = newStock - target.stock;
      const ref = `ADJ-2026-${Math.floor(100 + Math.random() * 899)}`;

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
      );
      setStockMovements((prev) => [
        {
          id: nextId('mov'),
          date: new Date().toISOString(),
          productId: target.id,
          productName: target.name,
          sku: target.sku,
          type: 'Adjustment',
          quantityChange: actualDelta,
          previousStock: target.stock,
          newStock,
          reference: ref,
          performedBy: user?.name ?? 'Store Manager',
          location: target.location,
          note: reason,
        },
        ...prev,
      ]);
      addToast(
        'Stock adjusted',
        'success',
        `${target.name}: ${target.stock} → ${newStock} ${target.unit}`
      );
    },
    [products, user, addToast]
  );

  const transferStock = useCallback(
    (productId: string, toLocation: string, quantity: number, note: string) => {
      const target = products.find((p) => p.id === productId);
      if (!target) return;
      const fromLocation = target.location;
      const ref = `TRF-2026-${Math.floor(100 + Math.random() * 899)}`;

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, location: toLocation } : p))
      );
      setStockMovements((prev) => [
        {
          id: nextId('mov'),
          date: new Date().toISOString(),
          productId: target.id,
          productName: target.name,
          sku: target.sku,
          type: 'Transfer',
          quantityChange: 0,
          previousStock: target.stock,
          newStock: target.stock,
          reference: ref,
          performedBy: user?.name ?? 'Store Manager',
          location: toLocation,
          note: `Transferred ${quantity} unit(s) from ${fromLocation} to ${toLocation}${note ? ` — ${note}` : ''}`,
        },
        ...prev,
      ]);
      addToast('Stock transfer recorded', 'success', `${target.name} moved to ${toLocation}.`);
    },
    [products, user, addToast]
  );

  const addSupplier = useCallback(
    (supplier: Omit<Supplier, 'id'>) => {
      setSuppliers((prev) => [{ ...supplier, id: nextId('sup') }, ...prev]);
      addToast('Supplier added', 'success', `${supplier.name} added to directory.`);
    },
    [addToast]
  );

  const updateSupplier = useCallback(
    (id: string, updates: Partial<Omit<Supplier, 'id'>>) => {
      setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
      addToast('Supplier updated', 'success');
    },
    [addToast]
  );

  const createPurchaseOrder = useCallback(
    (payload: {
      supplierId: string;
      expectedDate: string;
      items: PurchaseOrderItem[];
      notes?: string;
    }) => {
      const supplier = suppliers.find((s) => s.id === payload.supplierId);
      if (!supplier) return;
      const poNumber = `PO-2026-0${415 + purchaseOrders.length}`;
      const totalAmount = round2(
        payload.items.reduce(
          (sum, item) => sum + item.quantity * item.unitCost * (1 + item.gstRate / 100),
          0
        )
      );
      const po: PurchaseOrder = {
        id: nextId('po'),
        poNumber,
        supplierId: supplier.id,
        supplierName: supplier.name,
        orderDate: new Date().toISOString(),
        expectedDate: new Date(payload.expectedDate).toISOString(),
        status: 'Ordered',
        items: payload.items,
        totalAmount,
        notes: payload.notes,
      };
      setPurchaseOrders((prev) => [po, ...prev]);
      addToast('Purchase order created', 'success', `${poNumber} sent to ${supplier.name}.`);
    },
    [suppliers, purchaseOrders.length, addToast]
  );

  const receivePurchaseOrder = useCallback(
    (poId: string) => {
      const po = purchaseOrders.find((p) => p.id === poId);
      if (!po || po.status === 'Received') return;
      const nowIso = new Date().toISOString();

      setPurchaseOrders((prev) =>
        prev.map((p) =>
          p.id === poId ? { ...p, status: 'Received', receivedDate: nowIso } : p
        )
      );

      const movements: StockMovement[] = [];
      setProducts((prev) =>
        prev.map((prod) => {
          const poItem = po.items.find((i) => i.productId === prod.id);
          if (!poItem) return prod;
          const nextStock = prod.stock + poItem.quantity;
          movements.push({
            id: nextId('mov'),
            date: nowIso,
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            type: 'Purchase',
            quantityChange: poItem.quantity,
            previousStock: prod.stock,
            newStock: nextStock,
            reference: po.poNumber,
            performedBy: user?.name ?? 'Store Manager',
            location: prod.location,
            note: `Received from ${po.supplierName}`,
          });
          return { ...prod, stock: nextStock };
        })
      );

      setStockMovements((prev) => [...movements, ...prev]);
      pushNotification(
        `Received ${po.poNumber}`,
        `Stock replenished from ${po.supplierName} (${po.items.length} SKU).`,
        'success',
        'inventory'
      );
      addToast('Purchase order received', 'success', `${po.poNumber} added to live stock.`);
    },
    [purchaseOrders, user, pushNotification, addToast]
  );

  const processReturn = useCallback(
    (
      payload: ProcessReturnPayload
    ): { ok: boolean; returnRecord?: Return; error?: string } => {
      const sale = sales.find((s) => s.id === payload.saleId);
      if (!sale) return { ok: false, error: 'Selected invoice could not be found.' };
      if (payload.items.length === 0) {
        return { ok: false, error: 'Select at least one item quantity to return.' };
      }

      const returnItems: ReturnItem[] = [];
      let totalRefund = 0;

      for (const reqItem of payload.items) {
        const saleLine = sale.items.find((li) => li.productId === reqItem.productId);
        if (!saleLine) continue;
        const maxReturnable = saleLine.quantity - saleLine.returnedQuantity;
        if (reqItem.quantity <= 0 || reqItem.quantity > maxReturnable) {
          return {
            ok: false,
            error: `Cannot return more than remaining purchased quantity for ${saleLine.productName} (max ${maxReturnable}).`,
          };
        }
        const unitRefund = round2(saleLine.lineTotal / saleLine.quantity);
        const lineRefund = round2(unitRefund * reqItem.quantity);
        totalRefund = round2(totalRefund + lineRefund);
        returnItems.push({
          productId: saleLine.productId,
          productName: saleLine.productName,
          sku: saleLine.sku,
          quantity: reqItem.quantity,
          unitRefund,
          refundAmount: lineRefund,
          condition: reqItem.condition,
        });
      }

      if (returnItems.length === 0) {
        return { ok: false, error: 'No valid return lines found.' };
      }

      const nowIso = new Date().toISOString();
      const returnNumber = `RET-2026-0${119 + returns.length}`;
      const refundReference = `SIM-REF-${Math.floor(100000 + Math.random() * 900000)}`;
      const hasAnyRestock = returnItems.some((item) => item.condition === 'Sellable');
      const returnId = nextId('ret');

      const record: Return = {
        id: returnId,
        returnNumber,
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        date: nowIso,
        customerName: sale.customerName,
        processedBy: user?.name ?? 'Store Manager',
        reason: payload.reason,
        notes: payload.notes?.trim() || undefined,
        refundMethod: payload.refundMethod,
        refundReference,
        restockItems: hasAnyRestock,
        items: returnItems,
        totalRefund,
      };

      const refundPayment: Payment = {
        id: nextId('pay'),
        referenceNumber: refundReference,
        type: 'Refund',
        linkedDocumentId: returnId,
        linkedDocumentNumber: returnNumber,
        method: payload.refundMethod,
        amount: totalRefund,
        date: nowIso,
        simulated: true,
      };

      setReturns((prev) => [record, ...prev]);
      setPayments((prev) => [refundPayment, ...prev]);

      // Preserve original sale in history while updating returnedQuantity and status
      setSales((prev) =>
        prev.map((s) => {
          if (s.id !== sale.id) return s;
          const updatedItems = s.items.map((li) => {
            const retLine = returnItems.find((r) => r.productId === li.productId);
            if (!retLine) return li;
            return { ...li, returnedQuantity: li.returnedQuantity + retLine.quantity };
          });
          const allReturned = updatedItems.every((li) => li.returnedQuantity >= li.quantity);
          return {
            ...s,
            items: updatedItems,
            status: allReturned ? 'Returned' : 'Partial Return',
          };
        })
      );

      // Restore sellable stock ONLY; damaged goods are logged as non-restockable (quantityChange = 0)
      const movements: StockMovement[] = [];
      setProducts((prev) =>
        prev.map((prod) => {
          const retLine = returnItems.find((r) => r.productId === prod.id);
          if (!retLine) return prod;

          if (retLine.condition === 'Sellable') {
            const nextStock = prod.stock + retLine.quantity;
            movements.push({
              id: nextId('mov'),
              date: nowIso,
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              type: 'Return',
              quantityChange: retLine.quantity,
              previousStock: prod.stock,
              newStock: nextStock,
              reference: returnNumber,
              performedBy: user?.name ?? 'Store Manager',
              location: prod.location,
              note: `Sellable return from ${sale.invoiceNumber} restored to inventory`,
            });
            return { ...prod, stock: nextStock };
          } else {
            movements.push({
              id: nextId('mov'),
              date: nowIso,
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              type: 'Return',
              quantityChange: 0,
              previousStock: prod.stock,
              newStock: prod.stock,
              reference: returnNumber,
              performedBy: user?.name ?? 'Store Manager',
              location: prod.location,
              note: `Damaged return (${retLine.quantity} unit) from ${sale.invoiceNumber} — NOT added to sellable stock`,
            });
            return prod;
          }
        })
      );

      if (movements.length > 0) {
        setStockMovements((prev) => [...movements, ...prev]);
      }

      pushNotification(
        `Return ${returnNumber} processed`,
        `${sale.invoiceNumber} · Refund ${payload.refundMethod} (Simulated)`,
        'info',
        'returns'
      );

      const restoredUnits = returnItems
        .filter((i) => i.condition === 'Sellable')
        .reduce((s, i) => s + i.quantity, 0);
      const damagedUnits = returnItems
        .filter((i) => i.condition === 'Damaged')
        .reduce((s, i) => s + i.quantity, 0);

      addToast(
        `Simulated refund completed (${returnNumber})`,
        'success',
        restoredUnits > 0 && damagedUnits > 0
          ? `${restoredUnits} sellable unit(s) restocked; ${damagedUnits} damaged unit(s) excluded.`
          : restoredUnits > 0
          ? `${restoredUnits} sellable unit(s) restored to inventory.`
          : `${damagedUnits} damaged unit(s) recorded without restocking.`
      );

      return { ok: true, returnRecord: record };
    },
    [sales, returns.length, user, pushNotification, addToast]
  );

  const addEmployee = useCallback(
    (emp: Omit<Employee, 'id'>) => {
      setEmployees((prev) => [...prev, { ...emp, id: nextId('emp') }]);
      addToast('Staff member added', 'success', `${emp.name} (${emp.role}) added.`);
    },
    [addToast]
  );

  const updateEmployee = useCallback(
    (id: string, updates: Partial<Omit<Employee, 'id'>>) => {
      setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
      addToast('Employee details updated', 'success');
    },
    [addToast]
  );

  const toggleEmployeeStatus = useCallback(
    (id: string) => {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, status: e.status === 'Active' ? 'Inactive' : 'Active' }
            : e
        )
      );
      addToast('Employee status updated', 'info');
    },
    [addToast]
  );

  const updateSettings = useCallback(
    (updates: StoreSettings) => {
      setSettings(updates);
      addToast('Store settings saved', 'success', 'Updated store profile and receipt defaults.');
    },
    [addToast]
  );

  const openBarcodeLabelsForProducts = useCallback(
    (productIds: string[]) => {
      const uniqueIds = Array.from(new Set(productIds)).filter((id) =>
        products.some((p) => p.id === id)
      );
      if (uniqueIds.length > 0) {
        setBarcodeLabelQueue((prev) => {
          const existingMap = new Map(prev.map((item) => [item.productId, item.quantity]));
          return uniqueIds.map((productId) => ({
            productId,
            quantity: existingMap.get(productId) ?? 2,
          }));
        });
      }
      setActiveRoute('barcode-labels');
    },
    [products]
  );

  const inventory = useMemo(() => deriveInventoryRecords(products), [products]);

  const lowStockProducts = useMemo(
    () =>
      products
        .filter((p) => p.status === 'Active' && p.stock <= p.lowStockThreshold)
        .sort((a, b) => a.stock - b.stock),
    [products]
  );

  const value: POSContextValue = {
    user,
    activeRoute,
    setActiveRoute,
    login,
    loginAsRole,
    logout,
    products,
    inventory,
    categories,
    suppliers,
    purchaseOrders,
    sales,
    returns,
    payments,
    stockMovements,
    employees,
    settings,
    notifications,
    toasts,
    addToast,
    dismissToast,
    markNotificationRead,
    markAllNotificationsRead,
    completeSale,
    addProduct,
    updateProduct,
    toggleProductStatus,
    bulkImportProducts,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    adjustStock,
    transferStock,
    addSupplier,
    updateSupplier,
    createPurchaseOrder,
    receivePurchaseOrder,
    processReturn,
    addEmployee,
    updateEmployee,
    toggleEmployeeStatus,
    updateSettings,
    barcodeLabelQueue,
    setBarcodeLabelQueue,
    openBarcodeLabelsForProducts,
    lowStockProducts,
  };

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
}

export function usePOS(): POSContextValue {
  const ctx = useContext(POSContext);
  if (!ctx) throw new Error('usePOS must be used inside POSProvider');
  return ctx;
}
