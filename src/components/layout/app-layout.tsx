import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { ChevronDown, KeyRound, LogOut, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { useLogout, useSession } from '@/hooks/use-auth';
import { Avatar } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sidebar } from './sidebar';

export function AppLayout() {
  const { admin } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const logout = useLogout();
  const navigate = useNavigate();

  const signOut = () =>
    logout.mutate(undefined, {
      onSettled: () => {
        toast.success('You have signed out');
        navigate('/login', { replace: true });
      },
    });

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-zinc-200 lg:block">
        <Sidebar admin={admin} />
      </aside>

      {/* Mobile sidebar drawer */}
      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-zinc-950/40 data-[state=open]:animate-fade-in lg:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-xl data-[state=open]:animate-slide-in-left focus:outline-none lg:hidden">
            <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Main navigation</DialogPrimitive.Description>
            <Sidebar admin={admin} onNavigate={() => setMobileOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-zinc-200 bg-white/85 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="-ml-1 cursor-pointer rounded-md p-2 text-zinc-600 hover:bg-zinc-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>

          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex cursor-pointer items-center gap-2.5 rounded-lg py-1 pr-2 pl-1 hover:bg-zinc-100">
                <Avatar name={admin.name} className="size-8 text-xs" />
                <span className="hidden text-left sm:block">
                  <span className="block text-sm leading-tight font-medium text-zinc-900">{admin.name}</span>
                  <span className="block text-xs leading-tight text-zinc-500">{admin.role.name}</span>
                </span>
                <ChevronDown className="size-4 text-zinc-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60">
                <DropdownMenuLabel>
                  <div className="truncate font-medium text-zinc-900">{admin.name}</div>
                  <div className="truncate text-xs font-normal text-zinc-500">{admin.email}</div>
                  <Badge variant={admin.role.isSuperAdmin ? 'amber' : 'green'} className="mt-2">
                    {admin.role.name}
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account">
                    <KeyRound /> My account & password
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem danger onSelect={signOut} disabled={logout.isPending}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
