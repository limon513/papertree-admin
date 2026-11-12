import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, CheckCircle2, Download, Search, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAddresses, useApplySuggestions, useMigration, useReadOldSite, useSuggest, type AddressKind, type AddressState, type OldSiteRun } from '@/hooks/use-migration';
import { errorMessage } from '@/lib/api';
import { STORE_URL } from '@/lib/store';
import { cn, formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';

const STATES: Record<AddressState, { label: string; badge: BadgeProps['variant']; help: string }> = {
  ok: { label: 'Works', badge: 'green', help: 'The same address works on the new shop.' },
  redirected: { label: 'Redirected', badge: 'blue', help: 'It sends people on to the right page.' },
  hidden: { label: 'Not published', badge: 'amber', help: 'The product or category is here but hidden: publish it, or it shows “not found”.' },
  missing: { label: 'Missing', badge: 'gray', help: 'Nothing here yet: copy the products, or apply a suggestion.' },
};
const KINDS: Record<AddressKind, string> = { product: 'Products', category: 'Categories', page: 'Pages', other: 'Other' };
const site = STORE_URL.replace(/\/$/, '');

/** Super Admin: copy the old WooCommerce shop (products, categories, addresses) and keep its links working. */
export function MigrationPage() {
  const migration = useMigration();
  if (migration.isError) return <LoadError message={errorMessage(migration.error)} onRetry={() => migration.refetch()} />;
  if (migration.isPending) return <Skeleton className="h-96" />;
  const run = migration.data.run;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Move from old site"
        description="Copies the old shop's categories and products with the same web addresses, so old links and Google rankings keep working. Safe to run again: what is already here is skipped."
      />
      <ReadStep run={run} />
      {run?.status === 'ready' && run.importJob && <CopyStep run={run} />}
      {run && run.status !== 'reading' && <CheckStep />}
    </div>
  );
}

function ReadStep({ run }: { run: OldSiteRun | null }) {
  const read = useReadOldSite();
  const [url, setUrl] = useState(run?.site ?? 'https://papertree.com.bd');
  const [test, setTest] = useState(true);
  const [limit, setLimit] = useState('20');
  const reading = run?.status === 'reading';
  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Read the old site</CardTitle>
        <CardDescription>Reads its categories, every public address and its products. Nothing changes on the old site; it is read gently, one page at a time.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Old site" htmlFor="m-site" error={read.error ? errorMessage(read.error) : undefined}>
            <Input id="m-site" value={url} onChange={(e) => setUrl(e.target.value)} disabled={reading} />
          </Field>
          <Field label="How many products" htmlFor="m-limit" hint={test ? 'A test: only the first ones (and their categories).' : 'Everything (for the launch).'}>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-sm">
                <input type="radio" checked={test} onChange={() => setTest(true)} className="accent-brand-700" /> First
              </label>
              <Input id="m-limit" value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ''))} disabled={!test || reading} className="w-20" inputMode="numeric" />
              <label className="flex items-center gap-1.5 text-sm">
                <input type="radio" checked={!test} onChange={() => setTest(false)} className="accent-brand-700" /> All
              </label>
            </div>
          </Field>
        </div>
        <Button
          onClick={() => read.mutate({ site: url, limit: test ? Number(limit) || 20 : null }, { onSuccess: () => toast.success('Reading the old site') })}
          loading={read.isPending}
          disabled={reading}
        >
          <Download /> {run ? 'Read again' : 'Read the old site'}
        </Button>
        {run && (
          <div className={cn('rounded-lg p-3 text-sm', run.status === 'failed' ? 'bg-red-50 text-red-800' : 'bg-zinc-50 text-zinc-700')}>
            <div className="font-medium">
              {run.status === 'reading' ? 'Reading…' : run.status === 'ready' ? 'Read' : 'Stopped'} · {run.site}
              {run.productLimit ? ` · test (first ${run.productLimit})` : ' · everything'}
            </div>
            <div>{run.status === 'failed' ? run.error : run.step}</div>
            <div className="mt-1 text-xs text-zinc-500">
              {run.productsRead} products · {run.categories} categories · {run.addresses} addresses · started {formatDateTime(run.startedAt)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CopyStep({ run }: { run: OldSiteRun }) {
  const job = run.importJob!;
  const done = job.status === 'done';
  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Copy the products</CardTitle>
        <CardDescription>
          They are waiting in an import: check the preview, then start it. Pictures are downloaded from the old site. The old site only says “in stock” or not: products in stock sell
          freely until real stock counts are entered.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-zinc-700">
          {done ? <CheckCircle2 className="mr-1 inline size-4 text-brand-600" /> : null}
          Import #{job.id}: {job.status === 'preview' ? 'waiting for Start' : job.status} · {job.created} copied · {job.skipped} already here · {job.failed} with problems · {job.processed}/{job.total}
        </span>
        <Button asChild variant={done ? 'outline' : 'primary'}>
          <Link to={`/imports/${job.id}`}>
            {job.status === 'preview' ? 'Open the preview and start' : 'Open the import'} <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function CheckStep() {
  const [state, setState] = useState<AddressState | 'all'>('missing');
  const [kind, setKind] = useState<AddressKind | 'all'>('all');
  const [page, setPage] = useState(1);
  const report = useAddresses(state, kind, page);
  const suggest = useSuggest();
  const apply = useApplySuggestions();
  const [busy, setBusy] = useState<string | null>(null);
  const [picked, setPicked] = useState<number[]>([]);

  const look = async (again: boolean) => {
    setBusy('Looking for matches…');
    try {
      let first = again;
      for (;;) {
        const r = await suggest.mutateAsync(first);
        first = false;
        setBusy(`Looking for matches… ${r.left} left`);
        if (!r.left || !r.looked) break;
      }
      toast.success('Matches looked for');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };
  const doApply = (ids: number[] | null) =>
    apply.mutate(ids, {
      onSuccess: (r) => {
        setPicked([]);
        toast.success(`${r.made} redirect${r.made === 1 ? '' : 's'} made${r.problems.length ? `, ${r.problems.length} need a look` : ''}`);
      },
    });

  const counts = report.data?.counts ?? {};
  const totals = (Object.keys(STATES) as AddressState[]).map((s) => [s, Object.values(counts).reduce((n, c) => n + (c?.[s] ?? 0), 0)] as const);
  const withSuggestion = report.data?.items.filter((i) => i.state === 'missing' && i.suggestedPath !== null) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>3. Check the old addresses</CardTitle>
        <CardDescription>Every address of the old site, and whether it leads somewhere here. Fix the missing ones by copying products, or with a redirect.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.isPending ? (
          <p className="text-sm text-zinc-500">Counting the old addresses…</p>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500">
                <th className="py-1 font-medium" />
                {(Object.keys(STATES) as AddressState[]).map((s) => (
                  <th key={s} className="py-1 font-medium">
                    {STATES[s].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(Object.keys(KINDS) as AddressKind[]).map((k) => (
                <tr key={k}>
                  <td className="py-1.5 font-medium text-zinc-800">{KINDS[k]}</td>
                  {(Object.keys(STATES) as AddressState[]).map((s) => (
                    <td key={s} className={cn('py-1.5 tabular-nums', s === 'missing' && (counts[k]?.[s] ?? 0) > 0 && 'font-semibold text-zinc-900')}>
                      {counts[k]?.[s] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-1.5">All</td>
                {totals.map(([s, n]) => (
                  <td key={s} className="py-1.5 tabular-nums">
                    {n}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => look(false)} disabled={!!busy}>
            <Search /> {busy ?? 'Look for matches'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => look(true)} disabled={!!busy} title="Forget the old guesses (after more products were copied)">
            Look again from scratch
          </Button>
          <span className="ml-auto" />
          {picked.length > 0 && (
            <Button onClick={() => doApply(picked)} loading={apply.isPending}>
              Apply {picked.length} selected
            </Button>
          )}
          <Button variant="outline" onClick={() => doApply(null)} loading={apply.isPending} title="Every missing address that has a suggestion">
            Apply all suggestions
          </Button>
        </div>
        {apply.data && apply.data.problems.length > 0 && <ErrorAlert message={apply.data.problems.slice(0, 5).join(' · ')} />}

        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 rounded-lg bg-zinc-200/60 p-0.5" role="group" aria-label="State">
            {(['missing', 'hidden', 'redirected', 'ok', 'all'] as const).map((s) => (
              <button key={s} type="button" aria-pressed={state === s} onClick={() => (setState(s), setPage(1))} className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 aria-pressed:bg-white aria-pressed:text-zinc-900 aria-pressed:shadow-sm">
                {s === 'all' ? 'All' : STATES[s].label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-lg bg-zinc-200/60 p-0.5" role="group" aria-label="Kind">
            {(['all', 'product', 'category', 'page', 'other'] as const).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => (setKind(k), setPage(1))} className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 aria-pressed:bg-white aria-pressed:text-zinc-900 aria-pressed:shadow-sm">
                {k === 'all' ? 'All' : KINDS[k]}
              </button>
            ))}
          </div>
        </div>
        {state !== 'all' && <p className="text-xs text-zinc-500">{STATES[state].help}</p>}

        {report.isPending ? (
          <Skeleton className="h-48" />
        ) : !report.data?.items.length ? (
          <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500">Nothing here.</p>
        ) : (
          <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {withSuggestion.length > 0 && (
              <label className="flex items-center gap-2 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={withSuggestion.every((i) => picked.includes(i.id))}
                  onChange={(e) => setPicked(e.target.checked ? [...new Set([...picked, ...withSuggestion.map((i) => i.id)])] : picked.filter((id) => !withSuggestion.some((i) => i.id === id)))}
                  className="accent-brand-700"
                />
                Select the suggestions on this page
              </label>
            )}
            {report.data.items.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                {a.state === 'missing' && a.suggestedPath !== null ? (
                  <input type="checkbox" checked={picked.includes(a.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, a.id] : picked.filter((x) => x !== a.id))} aria-label={`Apply the suggestion for ${a.path}`} className="accent-brand-700" />
                ) : (
                  <span className="w-[13px]" />
                )}
                <Badge variant={STATES[a.state].badge}>{STATES[a.state].label}</Badge>
                <div className="min-w-0 flex-1 basis-72">
                  <a href={`${site}${a.path}`} target="_blank" rel="noreferrer" className="block truncate font-mono text-xs text-zinc-900 hover:text-brand-700">
                    {a.path}
                  </a>
                  {a.name && <div className="truncate text-xs text-zinc-500">{a.name}</div>}
                </div>
                {a.state === 'redirected' && <span className="font-mono text-xs text-brand-700">→ {a.redirectsTo || 'gone (410)'}</span>}
                {a.state === 'missing' && a.suggestedPath !== null && (
                  <span className="text-xs text-zinc-700">
                    Suggest: <span className="font-mono text-brand-700">{a.suggestedPath || 'gone (410)'}</span> {a.suggestedName ? `· ${a.suggestedName}` : ''}
                  </span>
                )}
                {a.state === 'missing' && a.suggestedPath === null && a.suggestedName === '—' && (
                  <span className="flex items-center gap-1 text-xs text-amber-700">
                    <TriangleAlert className="size-3.5" /> No match found
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {report.data && report.data.total > 50 && (
          <div className="flex items-center justify-end gap-2 text-sm text-zinc-600">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span>
              Page {page} of {Math.ceil(report.data.total / 50)}
            </span>
            <Button variant="outline" size="sm" disabled={page * 50 >= report.data.total} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
