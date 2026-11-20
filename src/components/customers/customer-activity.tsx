import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Laptop, Search, Smartphone, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { useMe } from '@/hooks/use-auth';
import { api, errorMessage } from '@/lib/api';
import { imageUrl, STORE_URL } from '@/lib/store';
import type { Media } from '@/lib/types';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/misc';

interface CustomerActivity {
  lastSeenAt: string | null;
  lastSignInAt: string | null;
  days: number;
  visits: { last30: number; last90: number };
  devices: { device: string; visits: number; last: string }[];
  products: { id: number; name: string; slug: string; image: Media | null; views: number; last: string }[];
  searches: { query: string; times: number; last: string }[];
  categories: { name: string; views: number }[];
  staffLogins: { name: string | null; at: string }[];
}

/** "Log in as customer": staff with the right role open the website as this customer, to help them. */
export function LoginAsButton({ customerId, name, blocked }: { customerId: number; name: string; blocked: boolean }) {
  const me = useMe();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const role = me.data?.admin.role;
  if (!role || (!role.isSuperAdmin && !role.canImpersonate)) return null;
  const go = async () => {
    // The tab opens now (a tap), so the browser does not block it; the link comes a moment later.
    const tab = window.open('about:blank', '_blank');
    setBusy(true);
    try {
      const r = await api<{ url: string }>(`/v1/admin/login-as/${customerId}`, { method: 'POST' });
      if (tab) tab.location.href = r.url;
      else window.location.href = r.url;
      setAsking(false);
    } catch (err) {
      tab?.close();
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="outline" onClick={() => setAsking(true)} disabled={blocked} title={blocked ? 'Unblock the customer first' : undefined}>
        <UserCog /> Log in as customer
      </Button>
      <ConfirmDialog
        open={asking}
        onOpenChange={setAsking}
        loading={busy}
        onConfirm={() => void go()}
        title={`Log in as ${name}?`}
        description="The website opens in a new tab as this customer, for 30 minutes, with a banner. Anything you order there is marked with your name. Reviews and alerts are not done for them. This is recorded. Tip: use a private window, so your own cart stays apart."
        confirmLabel="Open the website as them"
      />
    </>
  );
}

/** What the customer did on the website (signed in), the last 90 days. */
export function ActivityCard({ customerId }: { customerId: number }) {
  const q = useQuery({ queryKey: ['customers', 'activity', customerId], queryFn: () => api<CustomerActivity>(`/v1/admin/customers/${customerId}/activity`) });
  const a = q.data;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4 text-zinc-500" /> Website activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!a ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-zinc-500">Last seen</dt>
                <dd className="font-medium text-zinc-900" title={a.lastSeenAt ? formatDateTime(a.lastSeenAt) : undefined}>
                  {a.lastSeenAt ? timeAgo(a.lastSeenAt) : 'Not yet'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Visits</dt>
                <dd className="font-medium text-zinc-900">
                  {a.visits.last30} in 30 days · {a.visits.last90} in 90
                </dd>
              </div>
            </dl>
            {a.devices.length > 0 && (
              <ul className="space-y-1">
                {a.devices.map((d) => (
                  <li key={d.device} className="flex items-center gap-2 text-zinc-700">
                    {d.device.startsWith('Computer') ? <Laptop className="size-4 text-zinc-400" /> : <Smartphone className="size-4 text-zinc-400" />}
                    {d.device} <span className="text-zinc-400">· {d.visits} visit{d.visits === 1 ? '' : 's'}, last {timeAgo(d.last)}</span>
                  </li>
                ))}
              </ul>
            )}
            {a.categories.length > 0 && (
              <div>
                <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Likes</p>
                <p className="mt-1 text-zinc-800">{a.categories.map((c) => c.name).join(', ')}</p>
              </div>
            )}
            {a.products.length > 0 && (
              <div>
                <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Looked at</p>
                <ul className="mt-2 space-y-2">
                  {a.products.map((p) => (
                    <li key={p.id} className="flex items-center gap-2.5">
                      <span className="size-9 shrink-0 overflow-hidden rounded-md bg-zinc-100">{p.image && <img src={imageUrl(p.image, 160)} alt="" className="size-full object-cover" />}</span>
                      <a href={`${STORE_URL}/product/${p.slug}/`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-zinc-800 hover:text-brand-700">
                        {p.name}
                      </a>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {p.views > 1 ? `${p.views}× · ` : ''}
                        {timeAgo(p.last)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {a.searches.length > 0 && (
              <div>
                <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Searched for</p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {a.searches.map((s) => (
                    <li key={s.query} className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700" title={formatDateTime(s.last)}>
                      <Search className="size-3 text-zinc-400" /> {s.query}
                      {s.times > 1 && <span className="text-zinc-400">×{s.times}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!a.visits.last90 && !a.products.length && !a.searches.length && <p className="text-zinc-500">Nothing yet. Activity shows here once they visit the website signed in.</p>}
            {a.staffLogins.length > 0 && (
              <p className="border-t border-zinc-100 pt-3 text-xs text-zinc-500">
                Staff logged in as them: {a.staffLogins.map((s) => `${s.name ?? 'staff'} (${timeAgo(s.at)})`).join(', ')}
              </p>
            )}
            <p className="text-xs text-zinc-400">Kept for {a.days} days. Only while they are signed in; staff visits are not counted.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
