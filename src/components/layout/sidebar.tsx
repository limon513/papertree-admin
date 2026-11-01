import { NavLink } from 'react-router';
import { canOpen } from '@/hooks/use-auth';
import type { SignedInAdmin } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { NAV, type NavItem } from './nav';

function visible(item: NavItem, admin: SignedInAdmin) {
  if (item.superAdminOnly) return admin.role.isSuperAdmin;
  if (item.module) return canOpen(admin, item.module);
  return true;
}

export function Sidebar({ admin, onNavigate }: { admin: SignedInAdmin; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center border-b border-zinc-100 px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Main">
        {NAV.map((group, i) => {
          const items = group.items.filter((item) => visible(item, admin));
          if (!items.length) return null;
          return (
            <div key={group.label ?? i}>
              {group.label && (
                <div className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                  {group.label}
                </div>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-brand-50 text-brand-800'
                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={cn(
                              'size-[18px] shrink-0',
                              isActive ? 'text-brand-700' : 'text-zinc-400 group-hover:text-zinc-600',
                            )}
                          />
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-400">PaperTree Bangladesh</div>
    </div>
  );
}
