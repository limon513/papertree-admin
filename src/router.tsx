import { createBrowserRouter, Link, useRouteError } from 'react-router';
import { AppLayout } from '@/components/layout/app-layout';
import { RequireAuth, RequireModule, RequireSuperAdmin } from '@/components/layout/guards';
import { COMING_SOON } from '@/components/layout/nav';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/misc';
import { DashboardPage } from '@/pages/dashboard-page';
import { LoginPage } from '@/pages/login-page';
import { NotFoundPage } from '@/pages/not-found-page';

function CrashPage() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-medium text-zinc-900">Something went wrong on this page</p>
      <p className="text-sm text-zinc-500">Try reloading. If it keeps happening, tell the developer.</p>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Reload
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="flex justify-center py-24">
      <Spinner />
    </div>
  );
}

/*
 * Pages other than login and dashboard are loaded only when opened,
 * so the first load of the admin panel stays small and fast.
 */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <CrashPage /> },
  {
    element: <RequireAuth />,
    errorElement: <CrashPage />,
    children: [
      {
        element: <AppLayout />,
        hydrateFallbackElement: <PageLoading />,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            path: 'account',
            lazy: async () => {
              const { AccountPage } = await import('@/pages/account-page');
              return { Component: AccountPage };
            },
          },
          {
            path: 'staff',
            lazy: async () => {
              const { StaffPage } = await import('@/pages/staff-page');
              return {
                Component: () => (
                  <RequireSuperAdmin>
                    <StaffPage />
                  </RequireSuperAdmin>
                ),
              };
            },
          },
          {
            path: 'roles',
            lazy: async () => {
              const { RolesPage } = await import('@/pages/roles-page');
              return {
                Component: () => (
                  <RequireSuperAdmin>
                    <RolesPage />
                  </RequireSuperAdmin>
                ),
              };
            },
          },
          {
            path: 'products',
            lazy: async () => {
              const { ProductsPage } = await import('@/pages/products-page');
              return {
                Component: () => (
                  <RequireModule module="products">
                    <ProductsPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            // Same page for a new product (/products/new) and an existing one (/products/12).
            path: 'products/:id',
            lazy: async () => {
              const { ProductEditPage } = await import('@/pages/product-edit-page');
              return {
                Component: () => (
                  <RequireModule module="products">
                    <ProductEditPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            path: 'imports',
            lazy: async () => {
              const { ImportsPage } = await import('@/pages/imports-page');
              return {
                Component: () => (
                  <RequireModule module="imports">
                    <ImportsPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            path: 'imports/:id',
            lazy: async () => {
              const { ImportDetailPage } = await import('@/pages/import-detail-page');
              return {
                Component: () => (
                  <RequireModule module="imports">
                    <ImportDetailPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            path: 'categories',
            lazy: async () => {
              const { CategoriesPage } = await import('@/pages/categories-page');
              return {
                Component: () => (
                  <RequireModule module="products">
                    <CategoriesPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            path: 'brands',
            lazy: async () => {
              const { BrandsPage } = await import('@/pages/brands-page');
              return {
                Component: () => (
                  <RequireModule module="products">
                    <BrandsPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            path: 'settings',
            lazy: async () => {
              const { SettingsPage } = await import('@/pages/settings-page');
              return {
                Component: () => (
                  <RequireModule module="settings">
                    <SettingsPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            path: 'orders',
            lazy: async () => {
              const { OrdersPage } = await import('@/pages/orders-page');
              return {
                Component: () => (
                  <RequireModule module="orders">
                    <OrdersPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            // Same page for a new order (/orders/new) and changing one (/orders/12/edit).
            path: 'orders/new',
            lazy: async () => {
              const { OrderEditPage } = await import('@/pages/order-edit-page');
              return {
                Component: () => (
                  <RequireModule module="orders">
                    <OrderEditPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            path: 'orders/:id/edit',
            lazy: async () => {
              const { OrderEditPage } = await import('@/pages/order-edit-page');
              return {
                Component: () => (
                  <RequireModule module="orders">
                    <OrderEditPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            path: 'orders/:id',
            lazy: async () => {
              const { OrderPage } = await import('@/pages/order-page');
              return {
                Component: () => (
                  <RequireModule module="orders">
                    <OrderPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            path: 'customers',
            lazy: async () => {
              const { CustomersPage } = await import('@/pages/customers-page');
              return {
                Component: () => (
                  <RequireModule module="customers">
                    <CustomersPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            path: 'customers/:id',
            lazy: async () => {
              const { CustomerPage } = await import('@/pages/customer-page');
              return {
                Component: () => (
                  <RequireModule module="customers">
                    <CustomerPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            path: 'search-words',
            lazy: async () => {
              const { SearchWordsPage } = await import('@/pages/search-words-page');
              return {
                Component: () => (
                  <RequireModule module="products">
                    <SearchWordsPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            path: 'reports',
            lazy: async () => {
              const { ReportsPage } = await import('@/pages/reports-page');
              return {
                Component: () => (
                  <RequireModule module="reports">
                    <ReportsPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            path: 'leads',
            lazy: async () => {
              const { LeadsPage } = await import('@/pages/leads-page');
              return {
                Component: () => (
                  <RequireModule module="leads">
                    <LeadsPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            path: 'marketing',
            lazy: async () => {
              const { MarketingPage } = await import('@/pages/marketing-page');
              return {
                Component: () => (
                  <RequireModule module="marketing">
                    <MarketingPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            path: 'content',
            lazy: async () => {
              const { ContentPage } = await import('@/pages/content-page');
              return {
                Component: () => (
                  <RequireModule module="content">
                    <ContentPage />
                  </RequireModule>
                ),
              };
            },
          },
          {
            path: 'integrations',
            lazy: async () => {
              const { IntegrationsPage } = await import('@/pages/integrations-page');
              return {
                Component: () => (
                  <RequireSuperAdmin>
                    <IntegrationsPage />
                  </RequireSuperAdmin>
                ),
              };
            },
          },
          ...COMING_SOON.map((item) => ({
            path: item.to.slice(1),
            lazy: async () => {
              const { ComingSoonPage } = await import('@/pages/coming-soon-page');
              return {
                Component: () => (
                  <RequireModule module={item.module!}>
                    <ComingSoonPage title={item.label} />
                  </RequireModule>
                ),
              };
            },
          })),
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        // Printable invoice: no menu or header around it.
        path: 'orders/:id/invoice',
        hydrateFallbackElement: <PageLoading />,
        lazy: async () => {
          const { OrderInvoicePage } = await import('@/pages/order-invoice-page');
          return {
            Component: () => (
              <RequireModule module="orders">
                <OrderInvoicePage />
              </RequireModule>
            ),
          };
        },
      },
    ],
  },
]);
