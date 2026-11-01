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
    ],
  },
]);
