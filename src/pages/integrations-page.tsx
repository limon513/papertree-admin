import { useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, Copy, CreditCard, KeyRound, Mail, MessageSquare, Send, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { useIntegrations, useMessages, useSaveIntegration, useSmsBalance, useSteadfastBalance, useTestIntegration } from '@/hooks/use-integrations';
import { API_URL, ApiError, errorMessage } from '@/lib/api';
import type { Integration, IntegrationKey, MessageLogEntry } from '@/lib/types';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';
import { SwitchField } from '@/components/ui/switch';

const STATES: Record<Integration['state'], { label: string; badge: BadgeProps['variant'] }> = {
  ready: { label: 'Working', badge: 'green' },
  test: { label: 'Test mode', badge: 'amber' },
  off: { label: 'Off', badge: 'gray' },
  incomplete: { label: 'Not finished', badge: 'red' },
};

/** Integrations (Super Admins): email, SMS, Google sign-in and online payment, with their keys. */
export function IntegrationsPage() {
  const query = useIntegrations();
  const byKey = (key: IntegrationKey) => query.data?.items.find((i) => i.key === key);

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="The outside services the shop uses. Keys and passwords are stored encrypted and are never shown again after saving: type a new one to replace it."
      />
      {query.isError ? (
        <Card>
          <LoadError message={errorMessage(query.error)} onRetry={() => query.refetch()} />
        </Card>
      ) : query.isPending ? (
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {!query.data.canKeepSecrets && (
            <ErrorAlert message="The server has no SECRETS_KEY yet, so keys and passwords cannot be saved. Ask the developer to set it on the server." />
          )}
          <ServiceCard integration={byKey('email')!} icon={<Mail />} title="Email" intro="Order confirmations to customers and new-order alerts to the shop, sent with Resend.">
            {(f) => (
              <>
                <Field label="Send email" htmlFor="email-provider">
                  <Select id="email-provider" value={f.str('provider')} onChange={(e) => f.set('provider', e.target.value)}>
                    <option value="off">Off: send no emails</option>
                    <option value="resend">With Resend</option>
                  </Select>
                </Field>
                <SecretField f={f} name="apiKey" label="Resend API key" hint="Resend → API Keys → Create (sending access). Starts with re_." />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="From name" htmlFor="email-from-name" hint="What customers see as the sender.">
                    <Input id="email-from-name" value={f.str('fromName')} onChange={(e) => f.set('fromName', e.target.value)} placeholder="PaperTree" />
                  </Field>
                  <Field label="From address" htmlFor="email-from" error={f.errors.fromEmail} hint="On the domain you verified in Resend (Domains).">
                    <Input id="email-from" value={f.str('fromEmail')} onChange={(e) => f.set('fromEmail', e.target.value)} placeholder="orders@papertree.com.bd" invalid={!!f.errors.fromEmail} />
                  </Field>
                  <Field label="Replies go to (optional)" htmlFor="email-reply" error={f.errors.replyTo}>
                    <Input id="email-reply" value={f.str('replyTo')} onChange={(e) => f.set('replyTo', e.target.value)} placeholder="info.papertreebd@gmail.com" invalid={!!f.errors.replyTo} />
                  </Field>
                  <Field label="New-order alerts to (optional)" htmlFor="email-staff" error={f.errors.staffEmail} hint="The shop's inbox for new website orders.">
                    <Input id="email-staff" value={f.str('staffEmail')} onChange={(e) => f.set('staffEmail', e.target.value)} invalid={!!f.errors.staffEmail} />
                  </Field>
                </div>
                <TestMode f={f} listName="testRecipients" what="emails" placeholder="you@example.com, staff@example.com" />
              </>
            )}
          </ServiceCard>
          <TestBox channel="email" />

          <ServiceCard
            integration={byKey('sms')!}
            icon={<MessageSquare />}
            title="SMS"
            intro="Sign-in codes and order updates by SMS, with MiMSMS. MiMSMS only accepts this server's fixed IP address: add it in sms.mimsms.com → Utility → Developer."
          >
            {(f) => (
              <>
                <Field label="Send SMS" htmlFor="sms-provider">
                  <Select id="sms-provider" value={f.str('provider')} onChange={(e) => f.set('provider', e.target.value)}>
                    <option value="log">Never send: only write them to the log</option>
                    <option value="mimsms">With MiMSMS</option>
                  </Select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="MiMSMS account email" htmlFor="sms-user" error={f.errors.userName} hint="The email you sign in to sms.mimsms.com with.">
                    <Input id="sms-user" value={f.str('userName')} onChange={(e) => f.set('userName', e.target.value)} invalid={!!f.errors.userName} />
                  </Field>
                  <Field label="Sender ID" htmlFor="sms-sender" error={f.errors.senderId} hint="sms.mimsms.com → Utility → Sender ID, exactly as shown.">
                    <Input id="sms-sender" value={f.str('senderId')} onChange={(e) => f.set('senderId', e.target.value)} placeholder="8809612… or PaperTree" />
                  </Field>
                  <SecretField f={f} name="apiKey" label="MiMSMS API key" hint="sms.mimsms.com → Utility → Developer (it must be activated there)." />
                </div>
                <TestMode f={f} listName="testNumbers" what="SMS" placeholder="01712345678, 01812345678" />
                <SmsBalance />
              </>
            )}
          </ServiceCard>
          <TestBox channel="sms" />

          <ServiceCard
            integration={byKey('google')!}
            icon={<KeyRound />}
            title="Google sign-in"
            intro="Lets customers sign in with Google (Firebase). These four values are public by design; no secret is needed."
          >
            {(f) => (
              <>
                <SwitchField id="google-enabled" label="Show “Continue with Google”" checked={f.bool('enabled')} onCheckedChange={(v) => f.set('enabled', v)} />
                <p className="text-sm text-zinc-500">
                  Firebase console → Project settings → Your apps → Web app → <code>firebaseConfig</code>. Also add the website’s domain under Authentication → Settings → Authorized domains.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(['apiKey', 'authDomain', 'projectId', 'appId'] as const).map((name) => (
                    <Field key={name} label={name} htmlFor={`google-${name}`}>
                      <Input id={`google-${name}`} value={f.str(name)} onChange={(e) => f.set(name, e.target.value)} className="font-mono text-xs" />
                    </Field>
                  ))}
                </div>
              </>
            )}
          </ServiceCard>

          <ServiceCard
            integration={byKey('payment')!}
            icon={<CreditCard />}
            title="Online payment (SSLCommerz)"
            intro="bKash, Nagad and cards at checkout. Payment is not switched on in the shop yet: the details can be saved now."
          >
            {(f) => (
              <>
                <SwitchField id="pay-enabled" label="Offer online payment at checkout" description="Coming soon in the shop: saving this has no effect yet." checked={f.bool('enabled')} onCheckedChange={(v) => f.set('enabled', v)} />
                <SwitchField id="pay-sandbox" label="Sandbox (test payments, no real money)" checked={f.bool('sandbox')} onCheckedChange={(v) => f.set('sandbox', v)} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Store ID" htmlFor="pay-store">
                    <Input id="pay-store" value={f.str('storeId')} onChange={(e) => f.set('storeId', e.target.value)} />
                  </Field>
                  <SecretField f={f} name="storePassword" label="Store password" hint="From SSLCommerz with your Store ID." />
                </div>
              </>
            )}
          </ServiceCard>

          {byKey('steadfast') && (
            <ServiceCard
              integration={byKey('steadfast')!}
              icon={<Truck />}
              title="Steadfast courier"
              intro="Send ready orders to Steadfast from the order list in one click; the tracking code comes back on each order, and Steadfast's updates (on the way, delivered) come back by themselves."
            >
              {(f) => (
                <>
                  <SwitchField id="sf-enabled" label="Send orders with Steadfast" checked={f.bool('enabled')} onCheckedChange={(v) => f.set('enabled', v)} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SecretField f={f} name="apiKey" label="API key" hint="Steadfast portal → API (the API key)." />
                    <SecretField f={f} name="secretKey" label="Secret key" hint="Steadfast portal → API (the secret key)." />
                  </div>
                  <SwitchField
                    id="sf-auto"
                    label="When Steadfast delivers, mark the order delivered"
                    description="And record the cash the rider collected, and tell the customer (Settings → Customer messages)."
                    checked={f.bool('autoDeliver')}
                    onCheckedChange={(v) => f.set('autoDeliver', v)}
                  />
                  <SwitchField id="sf-items" label="Send item names with the parcel" description="The rider and the customer see what is inside." checked={f.bool('sendItems')} onCheckedChange={(v) => f.set('sendItems', v)} />
                  <SteadfastWebhook f={f} />
                  <SteadfastBalance />
                </>
              )}
            </ServiceCard>
          )}

          <MessageLog />
        </div>
      )}
    </div>
  );
}

// ---- One service ----

interface FormApi {
  str: (name: string) => string;
  bool: (name: string) => boolean;
  raw: (name: string) => unknown;
  set: (name: string, value: unknown) => void;
  secret: (name: string) => { saved: string | null; draft: string | null | undefined; setDraft: (v: string | null | undefined) => void };
  errors: Record<string, string>;
}

function ServiceCard({ integration, icon, title, intro, children }: { integration: Integration; icon: ReactNode; title: string; intro: string; children: (f: FormApi) => ReactNode }) {
  const save = useSaveIntegration();
  const [settings, setSettings] = useState(integration.settings);
  // undefined: keep the saved secret; a value: replace it; null: remove it.
  const [secrets, setSecrets] = useState<Record<string, string | null | undefined>>({});
  const errors = save.error instanceof ApiError ? save.error.fields : {};
  const general = save.isError && !Object.keys(errors).length ? errorMessage(save.error) : null;
  const state = STATES[integration.state];

  const f: FormApi = {
    str: (n) => String(settings[n] ?? ''),
    bool: (n) => !!settings[n],
    raw: (n) => settings[n],
    set: (n, v) => setSettings((s) => ({ ...s, [n]: v })),
    secret: (n) => ({ saved: integration.secrets[n] ?? null, draft: secrets[n], setDraft: (v) => setSecrets((s) => ({ ...s, [n]: v })) }),
    errors,
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const changedSecrets = Object.fromEntries(Object.entries(secrets).filter((e): e is [string, string | null] => e[1] !== undefined && e[1] !== ''));
    save.mutate(
      { key: integration.key, settings, secrets: changedSecrets },
      {
        onSuccess: () => {
          setSecrets({});
          toast.success(`${title} saved`);
        },
      },
    );
  };

  return (
    <Card className="overflow-hidden">
      <form onSubmit={submit} noValidate>
        <div className="flex items-start gap-3 border-b border-zinc-200 bg-zinc-50/70 px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-600 ring-1 ring-zinc-200 [&_svg]:size-5">{icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-zinc-900">{title}</h2>
              <Badge variant={state.badge}>{state.label}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-zinc-500">{intro}</p>
          </div>
        </div>
        <div className="space-y-4 px-5 py-5">
          {general && <ErrorAlert message={general} />}
          {children(f)}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-5 py-3">
          <span className="text-xs text-zinc-500">{integration.updatedAt ? `Saved ${timeAgo(integration.updatedAt)}${integration.updatedBy ? ` by ${integration.updatedBy}` : ''}` : 'Not set up yet'}</span>
          <Button type="submit" loading={save.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** A key or password: never shown once saved; type a new one to replace it, or remove it. */
function SecretField({ f, name, label, hint }: { f: FormApi; name: string; label: string; hint: string }) {
  const { saved, draft, setDraft } = f.secret(name);
  const id = `secret-${name}`;
  return (
    <Field label={label} htmlFor={id} hint={hint} error={f.errors[name]}>
      {saved && draft === undefined ? (
        <div className="flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm">
          <KeyRound className="size-4 text-brand-600" />
          <span className="flex-1 text-zinc-700">
            Saved, ends in <span className="font-mono">{saved}</span>
          </span>
          <button type="button" onClick={() => setDraft('')} className="cursor-pointer font-medium text-brand-700 hover:underline">
            Replace
          </button>
          <button type="button" onClick={() => setDraft(null)} className="cursor-pointer text-zinc-500 hover:text-red-600 hover:underline">
            Remove
          </button>
        </div>
      ) : draft === null ? (
        <div className="flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm text-red-700">
          <span className="flex-1">Will be removed when you save</span>
          <button type="button" onClick={() => setDraft(undefined)} className="cursor-pointer font-medium hover:underline">
            Keep it
          </button>
        </div>
      ) : (
        <Input id={id} type="password" autoComplete="off" value={draft ?? ''} onChange={(e) => setDraft(e.target.value)} placeholder={saved ? 'Type the new one' : 'Paste it here'} className="font-mono" />
      )}
    </Field>
  );
}

/**
 * Test mode: real messages cost money, so while testing they go only to these numbers / addresses
 * (everything else is only written to "Sent messages"). Away from the live server it is always on.
 */
function TestMode({ f, listName, what, placeholder }: { f: FormApi; listName: string; what: string; placeholder: string }) {
  const saved = (f.raw(listName) as string[] | undefined) ?? [];
  const [text, setText] = useState(saved.join(', '));
  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
      <SwitchField
        id={`${listName}-mode`}
        label="Test mode"
        description={`${what === 'SMS' ? 'SMS go' : 'Emails go'} only to the test list below; the rest are only written to “Sent messages”. Switch it off at launch. (On a developer's computer it is always on.)`}
        checked={f.bool('testMode')}
        onCheckedChange={(v) => f.set('testMode', v)}
      />
      <Field label={what === 'SMS' ? 'Test numbers' : 'Test addresses'} htmlFor={`${listName}-list`} error={f.errors[listName] ?? Object.entries(f.errors).find(([k]) => k.startsWith(`${listName}.`))?.[1]} hint="Separated by commas. Up to 10.">
        <Input
          id={`${listName}-list`}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            f.set(listName, e.target.value.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean));
          }}
          placeholder={placeholder}
        />
      </Field>
    </div>
  );
}

/** Where Steadfast sends its updates, and the token both sides use (pasted there, or made there and pasted here). */
function SteadfastWebhook({ f }: { f: FormApi }) {
  const url = `${API_URL || window.location.origin}/v1/webhooks/steadfast`;
  const token = f.str('webhookToken');
  const copy = (text: string, what: string) => navigator.clipboard.writeText(text).then(() => toast.success(`${what} copied`), () => toast.error('Could not copy'));
  const make = () => {
    if (token && !confirm('Make a new token? Then save, and paste it in the Steadfast portal too: the old one stops working.')) return;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    f.set('webhookToken', btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
  };
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
      <p className="text-sm font-medium text-zinc-900">Status updates (webhook)</p>
      <p className="text-sm text-zinc-500">
        In the Steadfast portal → Webhook: put this address as the <strong>Callback URL</strong>, and the same <strong>Auth token</strong> here and there. Updates are checked with
        it (Bearer token and signature), so nobody else can change your orders.
      </p>
      <Field label="Callback URL" htmlFor="sf-url" hint="Steadfast needs https: the live API address.">
        <div className="flex items-center gap-2">
          <code id="sf-url" className="min-w-0 flex-1 truncate rounded-md bg-white px-2.5 py-2 text-xs ring-1 ring-zinc-200">{url}</code>
          <Button type="button" variant="outline" size="sm" onClick={() => copy(url, 'Address')} aria-label="Copy the address">
            <Copy />
          </Button>
        </div>
      </Field>
      <Field label="Auth token" htmlFor="sf-token" error={f.errors.webhookToken} hint="Paste the one Steadfast made (Generate), or make one here. Then Save.">
        <div className="flex items-center gap-2">
          <Input id="sf-token" value={token} onChange={(e) => f.set('webhookToken', e.target.value.trim())} className="font-mono text-xs" autoComplete="off" invalid={!!f.errors.webhookToken} />
          <Button type="button" variant="outline" size="sm" disabled={!token} onClick={() => copy(token, 'Token')} aria-label="Copy the token">
            <Copy />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={make}>
            Make one
          </Button>
        </div>
      </Field>
    </div>
  );
}

/** Free check: money on the Steadfast account (also proves the keys work). */
function SteadfastBalance() {
  const balance = useSteadfastBalance();
  const r = balance.data;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" size="sm" loading={balance.isPending} onClick={() => balance.mutate()}>
        Check the connection
      </Button>
      <span className="text-xs text-zinc-500">Free: shows the account balance, sends nothing. Save first.</span>
      {r && (r.ok ? <span className="text-sm font-medium text-brand-700">Connected · Steadfast owes you ৳{r.balance.toLocaleString('en-US')}</span> : <span className="text-sm text-red-700">{r.message}</span>)}
      {balance.isError && <span className="text-sm text-red-700">{errorMessage(balance.error)}</span>}
    </div>
  );
}

/** Free check: SMS left on the account (also proves the key and the IP allow-list work). */
function SmsBalance() {
  const balance = useSmsBalance();
  const r = balance.data;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" size="sm" loading={balance.isPending} onClick={() => balance.mutate()}>
        Check balance
      </Button>
      <span className="text-xs text-zinc-500">Free: nothing is sent. Save first.</span>
      {r && (r.ok ? <span className="text-sm font-medium text-brand-700">{r.balance} SMS left</span> : <span className="text-sm text-red-700">{r.message}</span>)}
      {balance.isError && <span className="text-sm text-red-700">{errorMessage(balance.error)}</span>}
    </div>
  );
}

function TestBox({ channel }: { channel: 'email' | 'sms' }) {
  const test = useTestIntegration();
  const [to, setTo] = useState('');
  const result = test.data;
  return (
    <form
      className="-mt-3 flex flex-col gap-2 rounded-xl border border-dashed border-zinc-300 px-4 py-3 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        test.mutate({ key: channel, to }, { onError: (err) => toast.error(errorMessage(err)) });
      }}
    >
      <span className="text-sm font-medium text-zinc-700">Send a test {channel === 'email' ? 'email' : 'SMS'} to</span>
      <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder={channel === 'email' ? 'you@example.com' : '01712345678'} className="h-9 sm:w-64" aria-label={`Test ${channel} to`} />
      <Button type="submit" size="sm" variant="outline" loading={test.isPending} disabled={to.trim().length < 3}>
        <Send /> Send test
      </Button>
      {result && (
        <span className={cn('text-sm', result.status === 'failed' ? 'text-red-700' : 'text-brand-700')} role="status">
          {result.status === 'sent' ? (channel === 'sms' ? 'Sent. Check the phone.' : 'Sent. Check the inbox.') : result.status === 'logged' ? `Not sent: ${result.error ?? 'test mode'}. Written to Sent messages.` : `Not sent: ${result.error}`}
        </span>
      )}
    </form>
  );
}

// ---- Sent messages ----

const STATUS: Record<MessageLogEntry['status'], { label: string; badge: BadgeProps['variant'] }> = {
  sent: { label: 'Sent', badge: 'green' },
  logged: { label: 'Test mode', badge: 'amber' },
  failed: { label: 'Failed', badge: 'red' },
};

function MessageLog() {
  const [channel, setChannel] = useState<'all' | 'email' | 'sms'>('all');
  const [page, setPage] = useState(1);
  const list = useMessages(channel, page);
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50/70 px-5 py-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h2 className="font-semibold text-zinc-900">Sent messages</h2>
          <p className="text-sm text-zinc-500">Every email and SMS the shop sent, or in test mode would have sent. Sign-in codes show here until SMS is connected.</p>
        </div>
        <div className="flex rounded-lg bg-zinc-200/60 p-0.5" role="group" aria-label="Show">
          {(['all', 'email', 'sms'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => (setChannel(c), setPage(1))}
              aria-pressed={channel === c}
              className={cn('cursor-pointer rounded-md px-3 py-1 text-sm font-medium', channel === c ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900')}
            >
              {c === 'all' ? 'All' : c === 'email' ? 'Email' : 'SMS'}
            </button>
          ))}
        </div>
      </div>
      {list.isError ? (
        <LoadError message={errorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : !list.data ? (
        <div className="p-5">
          <Skeleton className="h-24 w-full" />
        </div>
      ) : list.data.items.length === 0 ? (
        <p className="flex items-center gap-2 px-5 py-8 text-sm text-zinc-500">
          <AlertTriangle className="size-4" /> Nothing sent yet.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {list.data.items.map((m) => (
            <li key={m.id} className="flex flex-col gap-1 px-5 py-3 text-sm sm:flex-row sm:items-start sm:gap-4">
              <span className="w-36 shrink-0 text-zinc-500" title={formatDateTime(m.createdAt)}>
                {timeAgo(m.createdAt)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">
                  {m.channel === 'email' ? 'Email' : 'SMS'} to {m.to}
                  {m.subject && <span className="font-normal text-zinc-600"> · {m.subject}</span>}
                </p>
                <p className="line-clamp-2 text-zinc-600">{m.body}</p>
                {m.error && <p className="text-red-700">{m.error}</p>}
              </div>
              <Badge variant={STATUS[m.status].badge}>{STATUS[m.status].label}</Badge>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-3">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Newer
          </Button>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Older
          </Button>
        </div>
      )}
    </Card>
  );
}
