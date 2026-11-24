import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Barcode,
  Bell,
  Boxes,
  Calendar,
  ChevronDown,
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  RotateCcw,
  Search,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  UserCog,
  X,
} from 'lucide-react';
import { usePOS } from '@/src/hooks/usePOS';
import { ProductThumbnail } from '@/src/components/ui/ProductThumbnail';
import { formatINR, formatTimeOnly } from '@/src/utils/format';
import { cn } from '@/src/utils/cn';
import type { RouteId } from '@/src/types/pos';

interface NavItem {
  id: RouteId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: 'Operations' | 'Catalog & Stock' | 'Management';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Operations' },
  { id: 'pos', label: 'Point of Sale', icon: ShoppingCart, section: 'Operations' },
  { id: 'sales', label: 'Sales', icon: Receipt, section: 'Operations' },
  { id: 'returns', label: 'Returns', icon: RotateCcw, section: 'Operations' },
  { id: 'products', label: 'Products', icon: Package, section: 'Catalog & Stock' },
  { id: 'barcode-labels', label: 'Barcode Labels', icon: Barcode, section: 'Catalog & Stock' },
  { id: 'categories', label: 'Categories', icon: FolderTree, section: 'Catalog & Stock' },
  { id: 'inventory', label: 'Inventory', icon: Boxes, section: 'Catalog & Stock' },
  { id: 'purchases', label: 'Purchases', icon: ClipboardList, section: 'Catalog & Stock' },
  { id: 'suppliers', label: 'Suppliers', icon: Truck, section: 'Catalog & Stock' },
  { id: 'reports', label: 'Reports', icon: BarChart3, section: 'Management' },
  { id: 'employees', label: 'Employees', icon: UserCog, section: 'Management' },
  { id: 'settings', label: 'Settings', icon: Settings, section: 'Management' },
];

const SECTIONS: NavItem['section'][] = ['Operations', 'Catalog & Stock', 'Management'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    user,
    activeRoute,
    setActiveRoute,
    logout,
    loginAsRole,
    settings,
    products,
    sales,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    lowStockProducts,
  } = usePOS();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const todayFormatted = useMemo(
    () =>
      new Intl.DateTimeFormat('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date()),
    []
  );

  const searchResults = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return { products: [], sales: [], pages: [] };
    return {
      products: products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.barcode.includes(q)
        )
        .slice(0, 4),
      sales: sales
        .filter(
          (s) =>
            s.invoiceNumber.toLowerCase().includes(q) ||
            s.customerName.toLowerCase().includes(q)
        )
        .slice(0, 3),
      pages: NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(q)).slice(0, 3),
    };
  }, [globalQuery, products, sales]);

  const hasSearchResults =
    searchResults.products.length > 0 ||
    searchResults.sales.length > 0 ||
    searchResults.pages.length > 0;

  const navigate = (route: RouteId) => {
    setActiveRoute(route);
    setMobileMenuOpen(false);
    setSearchFocused(false);
    setGlobalQuery('');
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-white border-r border-slate-200/80">
      <div className="flex h-16 items-center justify-between px-5 border-b border-slate-200/80 shrink-0">
        <button
          type="button"
          onClick={() => navigate('dashboard')}
          className="flex items-center gap-2.5 text-left cursor-pointer focus-visible:outline-none"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs shrink-0">
            <Store className="h-4 w-4" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-slate-900 whitespace-nowrap">
            RetailFlow POS
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation"
          className="lg:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Primary navigation">
        {SECTIONS.map((section) => (
          <div key={section}>
            <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {section}
            </p>
            <div className="space-y-0.5">
              {NAV_ITEMS.filter((item) => item.section === section).map((item) => {
                const Icon = item.icon;
                const isActive = activeRoute === item.id;
                const showLowStockCount =
                  item.id === 'inventory' && lowStockProducts.length > 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-all duration-150 cursor-pointer whitespace-nowrap',
                      isActive
                        ? 'bg-indigo-50/90 text-indigo-700 shadow-[inset_0_0_0_1px_rgba(79,70,229,0.12)]'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    )}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          isActive ? 'text-indigo-600' : 'text-slate-400'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {showLowStockCount && (
                      <span className="text-xs font-mono font-semibold text-amber-700 tabular-nums">
                        {lowStockProducts.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200/80 bg-slate-50/50 p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-800 truncate">{settings.storeName}</p>
        <p className="mt-0.5 font-mono text-[11px] text-slate-400 truncate">
          GSTIN {settings.gstin}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 max-w-[80vw] h-full">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate whitespace-nowrap">
                {settings.storeName}
              </p>
              <p className="hidden sm:block text-xs text-slate-500 truncate">
                {settings.city}, {settings.state}
              </p>
            </div>
          </div>

          {/* Global Search */}
          <div ref={searchRef} className="relative hidden md:block flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={globalQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setGlobalQuery(e.target.value);
                setSearchFocused(true);
              }}
              placeholder="Search products, SKU, barcode, or invoice..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
            {searchFocused && globalQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-11 z-40 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                {!hasSearchResults ? (
                  <p className="px-4 py-5 text-center text-xs text-slate-500">
                    No matching products, invoices, or screens for "{globalQuery}"
                  </p>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.pages.length > 0 && (
                      <div className="p-2">
                        <p className="px-2 py-1 text-[11px] font-medium text-slate-400">
                          Navigation
                        </p>
                        {searchResults.pages.map((page) => (
                          <button
                            key={page.id}
                            type="button"
                            onClick={() => navigate(page.id)}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <span>{page.label}</span>
                            <span className="text-xs text-slate-400">{page.section}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.products.length > 0 && (
                      <div className="p-2">
                        <p className="px-2 py-1 text-[11px] font-medium text-slate-400">
                          Products
                        </p>
                        {searchResults.products.map((prod) => (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => navigate('products')}
                            className="flex w-full items-center justify-between gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50 cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ProductThumbnail
                                src={prod.imageUrl}
                                alt={prod.name}
                                categoryId={prod.categoryId}
                                sku={prod.sku}
                                size="xs"
                              />
                              <div className="min-w-0">
                                <p className="font-medium text-slate-800 truncate">{prod.name}</p>
                                <p className="text-xs font-mono text-slate-400">
                                  {prod.sku} · Stock {prod.stock}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-semibold text-slate-900 tabular-nums shrink-0">
                              {formatINR(prod.sellingPrice)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.sales.length > 0 && (
                      <div className="p-2">
                        <p className="px-2 py-1 text-[11px] font-medium text-slate-400">
                          Invoices
                        </p>
                        {searchResults.sales.map((sale) => (
                          <button
                            key={sale.id}
                            type="button"
                            onClick={() => navigate('sales')}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50 cursor-pointer"
                          >
                            <div className="min-w-0 pr-3">
                              <p className="font-mono text-xs font-medium text-slate-800">
                                {sale.invoiceNumber}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {sale.customerName}
                              </p>
                            </div>
                            <span className="text-xs font-mono font-medium text-slate-900 tabular-nums shrink-0">
                              {formatINR(sale.totalAmount)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Controls: Date, Notifications, User Profile */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span className="tabular-nums">{todayFormatted}</span>
            </div>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setProfileOpen(false);
                }}
                aria-label="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-11 z-40 w-80 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-xs text-slate-500">
                        No notifications right now.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            markNotificationRead(n.id);
                            if (n.targetRoute) navigate(n.targetRoute);
                            setNotifOpen(false);
                          }}
                          className={cn(
                            'w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer',
                            !n.read && 'bg-indigo-50/40'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {n.title}
                            </p>
                            <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                              {formatTimeOnly(n.timestamp)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                            {n.message}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((o) => !o);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-100 text-xs font-semibold text-indigo-700 shrink-0">
                  {user?.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="hidden sm:block leading-tight">
                  <p className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                    {user?.name}
                  </p>
                  <p className="text-[11px] text-slate-500 whitespace-nowrap">
                    {user?.role}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 z-40 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                      ID {user?.employeeCode} · {user?.role}
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        loginAsRole(user?.role === 'Store Manager' ? 'cashier' : 'manager');
                        setProfileOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <UserCog className="h-3.5 w-3.5 text-slate-400" />
                      Switch to {user?.role === 'Store Manager' ? 'Head Cashier' : 'Store Manager'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('settings');
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <Settings className="h-3.5 w-3.5 text-slate-400" />
                      Store Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out (Login Screen)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
