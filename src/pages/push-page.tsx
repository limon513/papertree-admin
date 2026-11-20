import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { BellRing, CalendarClock, MoonStar, Send, Smartphone, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCancelPushCampaign, usePushCampaigns, useSendPushCampaign, useTestPushCampaign, type PushCampaign, type PushCampaignInput } from '@/hooks/use-push-campaigns';
import { ApiError, errorMessage } from '@/lib/api';
import { imageUrl } from '@/lib/store';
import type { Media } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';
import { ImageBox } from '@/components/catalog/picture-field';
import { PageHeader } from '@/components/layout/page-header';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { EmptyState, ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';

const STATUS: Record<PushCampaign['status'], { label: string; badge: BadgeProps['variant'] }> = {
  scheduled: { label: 'Planned', badge: 'blue' },
  sending: { label: 'Going out', badge: 'amber' },
  sent: { label: 'Sent', badge: 'green' },
  cancelled: { label: 'Cancelled', badge: 'gray' },
};

/** "2026-11-19T20:00" (Dhaka) -> ISO; empty -> null. */
const fromDhaka = (local: string) => (local ? new Date(`${local}:00+06:00`).toISOString() : null);
const hour = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? 'am' : 'pm'}`;

/**
 * Push messages (Marketing): offers and news to everyone who keeps offers on. The shop never sends at
 * night and keeps hours between offers, so customers are not annoyed.
 */
export function PushPage() {
  const list = usePushCampaigns();
  const send = useSendPushCampaign();
  const test = useTestPushCampaign();
  const cancel = useCancelPushCampaign();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/deals/');
  const [image, setImage] = useState<Media | null>(null);
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [at, setAt] = useState('');
  const [phone, setPhone] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [earliest, setEarliest] = useState<string | null>(null);
  const data = list.data;
  const fields = send.error instanceof ApiError ? send.error.fields : test.error instanceof ApiError ? test.error.fields : {};
  const input = (sendAt: string | null): PushCampaignInput => ({ title: title.trim(), body: body.trim(), url: url.trim(), imageId: image?.id ?? null, sendAt });

  const go = (sendAt: string | null) =>
    send.mutate(input(sendAt), {
      onSuccess: (c) => {
        setConfirming(false);
        setEarliest(null);
        setTitle('');
        setBody('');
        setImage(null);
        toast.success(new Date(c.sendAt).getTime() - Date.now() > 90_000 ? `Planned for ${formatDateTime(c.sendAt)}` : 'Going out now');
      },
      onError: (err) => {
        setConfirming(false);
        if (err instanceof ApiError && err.fields.earliest) setEarliest(err.fields.earliest);
      },
    });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setEarliest(null);
    setConfirming(true);
  };

  if (list.isError) return <LoadError message={errorMessage(list.error)} onRetry={() => list.refetch()} />;
  const rules = data?.rules;
  const devices = data?.audience.devices ?? 0;
  const picture = image ? imageUrl(image, 800) : null;

  return (
    <div>
      <PageHeader title="Push messages" description="Offers and news on customers’ phones and computers, free. Only devices whose owners keep “Offers and news” on get them." />
      {data && !data.audience.ready && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Push notifications are off. A Super Admin sets them up in <Link to="/integrations" className="font-medium underline">Integrations</Link>.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-5">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Title" htmlFor="push-title" error={fields.title} hint={`${title.length}/65: phones cut longer titles.`} required>
              <Input id="push-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={65} placeholder="Eid offer: 20% off art supplies" invalid={!!fields.title} />
            </Field>
            <Field label="Message" htmlFor="push-body" error={fields.body} hint={`${body.length}/180. One or two short sentences.`} required>
              <Textarea id="push-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={180} placeholder="Colours, brushes and canvas, this week only. Tap to shop." invalid={!!fields.body} />
            </Field>
            <Field label="Opens" htmlFor="push-url" error={fields.url} hint="A page of the shop: /deals/, /product-category/art-craft/ or a full address." required>
              <Input id="push-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/deals/" invalid={!!fields.url} />
            </Field>
            <Field label="Picture (optional)" htmlFor="push-image" hint="Shown large on Android and computers. A wide picture, 2:1, works best.">
              <ImageBox label="Picture" image={image} onChange={setImage} />
            </Field>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-zinc-800">When</legend>
              <div className="flex flex-wrap gap-2">
                {(['now', 'later'] as const).map((w) => (
                  <label key={w} className={cn('flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1', when === w ? 'bg-brand-50 ring-brand-300' : 'ring-zinc-200')}>
                    <input type="radio" name="push-when" checked={when === w} onChange={() => setWhen(w)} className="accent-brand-600" />
                    {w === 'now' ? 'As soon as allowed' : 'At a time'}
                  </label>
                ))}
                {when === 'later' && <Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className="h-10 w-56" aria-label="Send at (Dhaka time)" />}
              </div>
              {rules && (
                <p className="flex items-start gap-2 text-xs text-zinc-500">
                  <MoonStar className="mt-0.5 size-3.5 shrink-0" />
                  Never at night: between {hour(rules.quietFrom)} and {hour(rules.quietUntil)} it waits until {hour(rules.quietUntil)}. At least {rules.minGapHours} hours between offers. Times are Dhaka time.
                </p>
              )}
            </fieldset>
            {send.error && <ErrorAlert message={errorMessage(send.error)} />}
            {earliest && (
              <Button type="button" variant="outline" onClick={() => go(earliest)} loading={send.isPending}>
                <CalendarClock /> Plan it for {formatDateTime(earliest)}
              </Button>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4">
              <Button type="submit" disabled={!data?.audience.ready || devices === 0 || title.trim().length < 3 || body.trim().length < 5 || (when === 'later' && !at)}>
                <Send /> {when === 'now' ? 'Send' : 'Plan'} to {devices.toLocaleString()} device{devices === 1 ? '' : 's'}
              </Button>
              {data?.audience.testMode && <Badge variant="amber">Test mode: only the test phones</Badge>}
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          {/* How it looks on a phone (roughly). */}
          <Card className="p-4">
            <p className="mb-2 text-xs font-medium text-zinc-500 uppercase">On a phone</p>
            <div className="rounded-2xl bg-zinc-100 p-3">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <span className="flex size-4 items-center justify-center rounded bg-brand-600 text-white">
                    <BellRing className="size-2.5" />
                  </span>
                  PaperTree · now
                </div>
                <p className="mt-1.5 text-sm font-semibold text-zinc-900">{title || 'Your title'}</p>
                <p className="text-sm text-zinc-600">{body || 'Your message.'}</p>
                {picture && <img src={picture} alt="" className="mt-2 aspect-[2/1] w-full rounded-lg object-cover" />}
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-zinc-900">
              <Smartphone className="size-4" /> Try it on your phone first
            </p>
            <p className="mt-1 text-xs text-zinc-500">The number of a customer account with alerts on (sign in on the website and turn alerts on).</p>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                test.mutate({ ...input(null), phone }, { onSuccess: (r) => toast.success(`Test sent to ${r.sent} device${r.sent === 1 ? '' : 's'}`), onError: (err) => toast.error(errorMessage(err)) });
              }}
            >
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01712345678" className="h-9" aria-label="Phone number for the test" invalid={!!fields.phone} />
              <Button type="submit" size="sm" variant="outline" loading={test.isPending} disabled={phone.trim().length < 10 || title.trim().length < 3 || body.trim().length < 5}>
                Send test
              </Button>
            </form>
          </Card>
        </div>
      </div>

      <h2 className="mt-8 mb-3 font-semibold text-zinc-900">Sent and planned</h2>
      <Card className="overflow-hidden">
        {list.isPending ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : !data!.items.length ? (
          <EmptyState icon={<BellRing />} title="No push messages yet" description="Your first offer will show here, with how many saw and tapped it." />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {data!.items.map((c) => (
              <li key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                {c.image && <img src={imageUrl(c.image, 160)} alt="" className="size-14 shrink-0 rounded-lg object-cover ring-1 ring-zinc-200" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-900">{c.title}</span>
                    <Badge variant={STATUS[c.status].badge}>{STATUS[c.status].label}</Badge>
                  </div>
                  <p className="text-sm text-zinc-600">{c.body}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {c.status === 'scheduled' ? 'Goes out' : 'Sent'} {formatDateTime(c.sendAt)} · opens {c.url}
                    {c.createdByName && <> · by {c.createdByName}</>}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-4 text-sm tabular-nums">
                  {c.status !== 'scheduled' && c.status !== 'cancelled' && (
                    <>
                      <Stat label="Reached" value={`${c.sent.toLocaleString()}${c.targeted ? ` / ${c.targeted.toLocaleString()}` : ''}`} />
                      <Stat label="Tapped" value={`${c.taps.toLocaleString()}${c.sent ? ` (${Math.round((c.taps / c.sent) * 100)}%)` : ''}`} />
                      {(c.failed > 0 || c.removed > 0) && <Stat label="Not delivered" value={(c.failed + c.removed).toLocaleString()} />}
                    </>
                  )}
                  {c.status === 'scheduled' && (
                    <Button size="sm" variant="ghost" loading={cancel.isPending && cancel.variables === c.id} onClick={() => cancel.mutate(c.id, { onSuccess: () => toast.success('Cancelled'), onError: (err) => toast.error(errorMessage(err)) })}>
                      <X /> Cancel
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={when === 'now' ? `Send to ${devices.toLocaleString()} devices?` : 'Plan this message?'}
        description={
          when === 'now'
            ? 'It goes out now (or at 8 am if it is night). It cannot be called back once it starts.'
            : `It goes out ${at ? formatDateTime(fromDhaka(at)!) : ''} (Dhaka time). You can cancel it until then.`
        }
        confirmLabel={when === 'now' ? 'Send' : 'Plan it'}
        loading={send.isPending}
        onConfirm={() => go(when === 'later' ? fromDhaka(at) : null)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-right">
      <span className="block font-semibold text-zinc-900">{value}</span>
      <span className="block text-xs text-zinc-500">{label}</span>
    </span>
  );
}
