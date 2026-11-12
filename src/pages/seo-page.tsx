import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowRight, EyeOff, FileUp, Pencil, Plus, Search, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useDeleteRedirect,
  useIgnoreNotFound,
  useImportRedirects,
  useNotFound,
  useRedirects,
  useSaveRedirect,
  useSeoSummary,
  type Redirect,
  type RedirectCode,
  type RedirectSource,
} from '@/hooks/use-seo';
import { ApiError, errorMessage } from '@/lib/api';
import { STORE_URL } from '@/lib/store';
import { cn, formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { EmptyState, ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';

const SOURCES: Record<RedirectSource, { label: string; badge: BadgeProps['variant'] }> = {
  manual: { label: 'Added by staff', badge: 'gray' },
  auto: { label: 'Address changed', badge: 'blue' },
  'old-site': { label: 'Old site', badge: 'green' },
};
const CODES: { value: RedirectCode; label: string; hint: string }[] = [
  { value: 301, label: 'Moved for good (301)', hint: 'Use this almost always: Google moves the old page’s ranking to the new address.' },
  { value: 302, label: 'Moved for now (302)', hint: 'For a short while only (Google keeps the old address).' },
  { value: 410, label: 'Gone for good (410)', hint: 'Nothing to send people to: Google drops the address.' },
];
const site = STORE_URL.replace(/\/$/, '');

/** Old addresses and where they go, and addresses visitors could not find. */
export function SeoPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'not-found' ? 'not-found' : 'redirects';
  const summary = useSeoSummary();
  const [editing, setEditing] = useState<Redirect | { fromPath: string } | 'new' | null>(null);
  const [importing, setImporting] = useState(false);

  return (
    <div>
      <PageHeader
        title="Redirects & 404s"
        description="Keep old links working, so Google rankings and shared links are not lost. Changing a product, category or brand address adds its redirect by itself."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImporting(true)}>
              <FileUp /> Add many
            </Button>
            <Button onClick={() => setEditing('new')}>
              <Plus /> Add redirect
            </Button>
          </div>
        }
      />

      <div role="tablist" className="mb-4 flex gap-1 border-b border-zinc-200">
        {(
          [
            ['redirects', `Redirects${summary.data ? ` (${summary.data.redirects})` : ''}`],
            ['not-found', `Not found${summary.data ? ` (${summary.data.notFound})` : ''}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setParams(key === 'redirects' ? {} : { tab: key }, { replace: true })}
            className={cn('-mb-px border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap', tab === key ? 'border-brand-600 text-brand-800' : 'border-transparent text-zinc-500 hover:text-zinc-800')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'redirects' ? <RedirectList onEdit={setEditing} /> : <NotFoundList onFix={(path) => setEditing({ fromPath: path })} />}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && <RedirectForm key={editing === 'new' ? 'new' : 'id' in editing ? editing.id : editing.fromPath} start={editing} onDone={() => setEditing(null)} />}
      </Dialog>
      <Dialog open={importing} onOpenChange={setImporting}>
        {importing && <ImportForm onDone={() => setImporting(false)} />}
      </Dialog>
    </div>
  );
}

function Pager({ page, total, size, onPage }: { page: number; total: number; size: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-sm text-zinc-600">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span>
        Page {page} of {pages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </div>
  );
}

function RedirectList({ onEdit }: { onEdit: (r: Redirect) => void }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const list = useRedirects(search, page);
  const remove = useDeleteRedirect();
  const [toDelete, setToDelete] = useState<Redirect | null>(null);

  return (
    <>
      <div className="relative mb-3 max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
        <Input value={search} onChange={(e) => (setSearch(e.target.value), setPage(1))} placeholder="Find an address" aria-label="Find a redirect" className="pl-9" />
      </div>
      {list.isError ? (
        <LoadError message={errorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <Skeleton className="h-64" />
      ) : !list.data.items.length ? (
        <Card>
          <EmptyState icon={<ArrowRight />} title={search ? 'No redirects match' : 'No redirects yet'} description="They appear here when an address changes, from the old site check, or when you add one." />
        </Card>
      ) : (
        <Card className="divide-y divide-zinc-100">
          {list.data.items.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1 basis-80">
                <div className="flex flex-wrap items-center gap-2">
                  <a href={`${site}${r.fromPath}`} target="_blank" rel="noreferrer" className="truncate font-mono text-zinc-900 hover:text-brand-700">
                    {r.fromPath}
                  </a>
                  <ArrowRight className="size-3.5 shrink-0 text-zinc-400" />
                  {r.code === 410 ? <Badge variant="amber">Gone (410)</Badge> : <span className="truncate font-mono text-brand-700">{r.toPath}</span>}
                  {r.code === 302 && <Badge variant="gray">For now</Badge>}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-zinc-500">
                  <Badge variant={SOURCES[r.source].badge}>{SOURCES[r.source].label}</Badge>
                  <span>
                    {r.hits} visit{r.hits === 1 ? '' : 's'}
                    {r.lastHitAt ? `, last ${formatDateTime(r.lastHitAt)}` : ''}
                  </span>
                  {r.note && <span className="truncate">· {r.note}</span>}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onEdit(r)} aria-label={`Edit the redirect from ${r.fromPath}`}>
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setToDelete(r)} aria-label={`Delete the redirect from ${r.fromPath}`}>
                <Trash2 />
              </Button>
            </div>
          ))}
        </Card>
      )}
      {list.data && <Pager page={page} total={list.data.total} size={list.data.pageSize} onPage={setPage} />}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this redirect?"
        description={toDelete ? `${toDelete.fromPath} will show “not found” again.` : ''}
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => (toast.success('Redirect deleted'), setToDelete(null)) })}
      />
    </>
  );
}

function NotFoundList({ onFix }: { onFix: (path: string) => void }) {
  const [view, setView] = useState<'open' | 'ignored'>('open');
  const [page, setPage] = useState(1);
  const list = useNotFound(view, page);
  const ignore = useIgnoreNotFound();
  return (
    <>
      <p className="mb-3 text-sm text-zinc-500">Addresses visitors or Google asked for that do not exist, most asked first. Add a redirect for the ones that matter.</p>
      <div className="mb-3 flex gap-1 rounded-lg bg-zinc-200/60 p-0.5" role="group" style={{ width: 'fit-content' }}>
        {(['open', 'ignored'] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => (setView(v), setPage(1))} className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 aria-pressed:bg-white aria-pressed:text-zinc-900 aria-pressed:shadow-sm">
            {v === 'open' ? 'To look at' : 'Ignored'}
          </button>
        ))}
      </div>
      {list.isError ? (
        <LoadError message={errorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <Skeleton className="h-64" />
      ) : !list.data.items.length ? (
        <Card>
          <EmptyState icon={<Search />} title="Nothing here" description="When someone opens an address that does not exist, it shows up here." />
        </Card>
      ) : (
        <Card className="divide-y divide-zinc-100">
          {list.data.items.map((n) => (
            <div key={n.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1 basis-80">
                <div className="truncate font-mono text-zinc-900">{n.path}</div>
                <div className="text-xs text-zinc-500">
                  {n.hits} time{n.hits === 1 ? '' : 's'}, last {formatDateTime(n.lastSeenAt)}
                  {n.referrer ? ` · from ${n.referrer}` : ''}
                </div>
              </div>
              {view === 'open' && (
                <Button size="sm" onClick={() => onFix(n.path)}>
                  Add redirect
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => ignore.mutate({ id: n.id, ignored: view === 'open' })}>
                {view === 'open' ? <EyeOff /> : <Undo2 />} {view === 'open' ? 'Ignore' : 'Look again'}
              </Button>
            </div>
          ))}
        </Card>
      )}
      {list.data && <Pager page={page} total={list.data.total} size={list.data.pageSize} onPage={setPage} />}
    </>
  );
}

function RedirectForm({ start, onDone }: { start: Redirect | { fromPath: string } | 'new'; onDone: () => void }) {
  const save = useSaveRedirect();
  const existing = start !== 'new' && 'id' in start ? start : null;
  const [fromPath, setFrom] = useState(start === 'new' ? '' : start.fromPath);
  const [toPath, setTo] = useState(existing?.toPath ?? '');
  const [code, setCode] = useState<RedirectCode>(existing?.code ?? 301);
  const [note, setNote] = useState(existing?.note ?? '');
  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const general = save.error && !(save.error instanceof ApiError && Object.keys(fields).length) ? errorMessage(save.error) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate({ id: existing?.id, input: { fromPath, toPath: code === 410 ? '' : toPath, code, note: note.trim() || null } }, { onSuccess: () => (toast.success('Redirect saved'), onDone()) });
  };

  return (
    <DialogContent title={existing ? 'Edit redirect' : 'Add redirect'} description="A full address or just the path both work; capitals, spaces and ?extras are tidied.">
      <form onSubmit={submit} noValidate>
        <DialogBody>
          {general && <ErrorAlert message={general} />}
          <Field label="Old address" htmlFor="r-from" required error={fields.fromPath} hint="e.g. /product/old-pen-name/">
            <Input id="r-from" value={fromPath} onChange={(e) => setFrom(e.target.value)} invalid={!!fields.fromPath} className="font-mono" />
          </Field>
          <Field label="What to do" htmlFor="r-code" hint={CODES.find((c) => c.value === code)?.hint}>
            <Select id="r-code" value={code} onChange={(e) => setCode(Number(e.target.value) as RedirectCode)}>
              {CODES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          {code !== 410 && (
            <Field label="New address" htmlFor="r-to" required error={fields.toPath} hint="An address on this website, e.g. /product/new-pen-name/ or /search/?q=pen">
              <Input id="r-to" value={toPath} onChange={(e) => setTo(e.target.value)} invalid={!!fields.toPath} className="font-mono" />
            </Field>
          )}
          <Field label="Note" htmlFor="r-note" hint="Optional, for staff.">
            <Input id="r-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            Save
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ImportForm({ onDone }: { onDone: () => void }) {
  const run = useImportRedirects();
  const [lines, setLines] = useState('');
  return (
    <DialogContent size="lg" title="Add many redirects" description="One per line: old address, new address. Use 410 instead of a new address for pages gone for good. Up to 5,000 lines.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run.mutate(lines, { onSuccess: (r) => (r.problems.length ? toast.warning(`${r.saved} saved, ${r.problems.length} need a look`) : (toast.success(`${r.saved} redirects saved`), onDone())) });
        }}
      >
        <DialogBody>
          <Textarea rows={10} value={lines} onChange={(e) => setLines(e.target.value)} placeholder={'/product/old-pen/, /product/new-pen/\n/old-offer/, 410'} className="font-mono text-xs" aria-label="Redirect lines" />
          {run.data && run.data.problems.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              {run.data.problems.map((p) => (
                <div key={p.line}>
                  Line {p.line} <span className="font-mono">{p.text}</span>: {p.message}
                </div>
              ))}
            </div>
          )}
          {run.error && <ErrorAlert message={errorMessage(run.error)} />}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Close
          </Button>
          <Button type="submit" loading={run.isPending} disabled={!lines.trim()}>
            Save all
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
