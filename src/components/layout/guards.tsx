import type { ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { ShieldOff } from 'lucide-react';
import { canOpen, useMe, useSession } from '@/hooks/use-auth';
import { errorMessage } from '@/lib/api';
import type { ModuleKey } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { LoadError, Spinner } from '@/components/ui/misc';

function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner className="size-7" />
    </div>
  );
}

/** Pages inside require a signed-in admin; otherwise go to the login page. */
export function RequireAuth() {
  const me = useMe();
  const location = useLocation();

  if (me.isPending) return <FullPageSpinner />;
  if (me.isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadError message={errorMessage(me.error)} onRetry={() => me.refetch()} />
      </div>
    );
  }
  if (!me.data) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

function NoAccess() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-zinc-100">
        <ShieldOff className="size-6 text-zinc-500" />
      </div>
      <div>
        <p className="font-medium text-zinc-900">You don't have access to this section</p>
        <p className="mt-1 text-sm text-zinc-500">Ask a Super Admin to add it to your role.</p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link to="/">Go to dashboard</Link>
      </Button>
    </div>
  );
}

export function RequireModule({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const { admin } = useSession();
  return canOpen(admin, module) ? children : <NoAccess />;
}

export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { admin } = useSession();
  return admin.role.isSuperAdmin ? children : <NoAccess />;
}
