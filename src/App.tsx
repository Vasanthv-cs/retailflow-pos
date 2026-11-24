import { AppShell } from '@/src/layouts/AppShell';
import { Toaster } from '@/src/components/ui/Toaster';
import { POSProvider, usePOS } from '@/src/context/POSContext';
import { BarcodeLabelsPage } from '@/src/pages/BarcodeLabelsPage';
import { CategoriesPage } from '@/src/pages/CategoriesPage';
import { DashboardPage } from '@/src/pages/DashboardPage';
import { EmployeesPage } from '@/src/pages/EmployeesPage';
import { InventoryPage } from '@/src/pages/InventoryPage';
import { LoginPage } from '@/src/pages/LoginPage';
import { POSTerminalPage } from '@/src/pages/POSTerminalPage';
import { ProductsPage } from '@/src/pages/ProductsPage';
import { PurchasesPage } from '@/src/pages/PurchasesPage';
import { ReportsPage } from '@/src/pages/ReportsPage';
import { ReturnsPage } from '@/src/pages/ReturnsPage';
import { SalesPage } from '@/src/pages/SalesPage';
import { SettingsPage } from '@/src/pages/SettingsPage';
import { SuppliersPage } from '@/src/pages/SuppliersPage';

function RetailFlowRouter() {
  const { user, activeRoute } = usePOS();

  if (!user) {
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    );
  }

  const renderPage = () => {
    switch (activeRoute) {
      case 'dashboard':
        return <DashboardPage />;
      case 'pos':
        return <POSTerminalPage />;
      case 'products':
        return <ProductsPage />;
      case 'barcode-labels':
        return <BarcodeLabelsPage />;
      case 'categories':
        return <CategoriesPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'purchases':
        return <PurchasesPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'sales':
        return <SalesPage />;
      case 'returns':
        return <ReturnsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'employees':
        return <EmployeesPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <>
      <AppShell>{renderPage()}</AppShell>
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <POSProvider>
      <RetailFlowRouter />
    </POSProvider>
  );
}
