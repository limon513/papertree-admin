import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { canOpen, useSession } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { NAV } from '@/components/layout/nav';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const { admin, modules } = useSession();
  const firstName = admin.name.split(/\s+/)[0];

  const sections = NAV.flatMap((g) => g.items).filter((item) =>
    item.superAdminOnly ? admin.role.isSuperAdmin : item.module ? canOpen(admin, item.module) : false,
  );
  const describe = (key?: string) => modules.find((m) => m.key === key)?.description;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          You're signed in as <span className="font-medium text-zinc-700">{admin.role.name}</span>. Here's what you can
          manage.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((item) => {
          const ready = item.superAdminOnly;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="group flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-brand-300 hover:shadow-md"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <item.icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-medium text-zinc-900">{item.label}</span>
                  {!ready && <Badge>Coming soon</Badge>}
                </span>
                <span className="mt-1 block text-sm text-zinc-500">
                  {describe(item.module) ??
                    (item.to === '/staff' ? 'Add staff and control who can sign in' : 'Decide what each role can open')}
                </span>
              </span>
              <ArrowRight className="mt-1 size-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
