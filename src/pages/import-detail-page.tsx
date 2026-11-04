import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  ExternalLink,
  Info,
  Plus,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCancelImport, useImport, useStartImport, type ImportRowFilter } from '@/hooks/use-imports';
import { errorMessage } from '@/lib/api';
import type { ImportDetail, ImportJob, ImportRow } from '@/lib/types';
import { cn, formatDateTime, formatMoney } from '@/lib/utils';
import { FORMAT_LABEL, ImportStatusBadge, jobTitle } from '@/components/imports/import-status';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';

export function ImportDetailPage() {
  const id = Number(useParams().id);
  const [filter, setFilter] = useState<ImportRowFilter>('all');
  const [page, setPage] = useState(1);
  const detail = useImport(id, filter, page);
  const queryClient = useQueryClient();

  // When a running import finishes, the products list has new data.
  const lastStatus = useRef<string | undefined>(undefined);
  const status = detail.data?.job.status;
  useEffect(() => {
    if (lastStatus.current && lastStatus.current !== status && (status === 'done' || status === 'failed')) {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      if (status === 'done') toast.success('Import finished');
    }
    lastStatus.current = status;
  }, [status, queryClient]);

  if (detail.isError) {
    return (
      <Card>
        <LoadError message={errorMessage(detail.error)} onRetry={() => detail.refetch()} />
      </Card>
    );
  }
  if (!detail.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { job } = detail.data;
  return (
    <div className="space-y-6">
      <div>
        <Link to="/imports" className="mb-1 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="size-4" /> Product Imports
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-900">{jobTitle(job)}</h1>
          <ImportStatusBadge status={job.status} />
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {FORMAT_LABEL[job.format]} · {job.format === 'link' ? 'added' : 'uploaded'} {formatDateTime(job.createdAt)}
          {job.createdBy && ` by ${job.createdBy.name}`}
        </p>
        {job.format === 'link' && (
          <a
            href={job.fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex max-w-full items-center gap-1 text-sm text-brand-700 hover:underline"
          >
            <span className="truncate">{job.fileName}</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
        )}
      </div>

      {job.status === 'preview' ? (
        <PreviewPanel job={job} />
      ) : job.status === 'queued' || job.status === 'running' ? (
        <ProgressPanel job={job} />
      ) : (
        <ResultPanel job={job} />
      )}

      <RowsTable
        data={detail.data}
        filter={filter}
        onFilter={(f) => {
          setFilter(f);
          setPage(1);
        }}
        onPage={setPage}
        loading={detail.isPlaceholderData}
      />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'green' | 'blue' | 'gray' | 'red' }) {
  const tones = {
    green: 'text-brand-700',
    blue: 'text-sky-700',
    gray: 'text-zinc-600',
    red: 'text-red-600',
  };
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-xs">
      <div className={cn('text-2xl font-semibold tabular-nums', value === 0 ? 'text-zinc-300' : tones[tone])}>{value}</div>
      <div className="text-sm text-zinc-600">{label}</div>
    </div>
  );
}

function optionsText(job: ImportJob) {
  return [
    job.options.existing === 'update' ? 'existing SKUs: update price and stock' : 'existing SKUs: skip',
    job.options.status === 'draft' ? 'new products as drafts' : 'status as in the file',
    job.options.createMissing ? 'create missing categories and brands' : 'no new categories or brands',
  ].join(' · ');
}

function PreviewPanel({ job }: { job: ImportJob }) {
  const start = useStartImport();
  const cancel = useCancelImport();
  const nothing = job.preview.create + job.preview.update === 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="New products" value={job.preview.create} tone="green" />
        <Stat label="Updates" value={job.preview.update} tone="blue" />
        <Stat label="Skipped (already in the shop)" value={job.preview.skip} tone="gray" />
        <Stat label="With problems (not imported)" value={job.preview.error} tone="red" />
      </div>
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-zinc-600">
          <p className="font-medium text-zinc-900">
            {nothing ? 'There is nothing to import in this file.' : 'Check the list below, then start the import.'}
          </p>
          <p className="mt-0.5 text-xs">{optionsText(job)}</p>
          {job.preview.error > 0 && !nothing && (
            <p className="mt-1 text-xs text-red-600">
              Products with problems are left out. Fix them in the file and import it again later.
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            disabled={start.isPending}
            loading={cancel.isPending}
            onClick={() => cancel.mutate(job.id, { onError: (err) => toast.error(errorMessage(err)) })}
          >
            Cancel
          </Button>
          <Button
            disabled={nothing || cancel.isPending}
            loading={start.isPending}
            onClick={() => start.mutate(job.id, { onError: (err) => toast.error(errorMessage(err)) })}
          >
            Start import
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ProgressPanel({ job }: { job: ImportJob }) {
  const cancel = useCancelImport();
  const [confirm, setConfirm] = useState(false);
  const percent = job.total ? Math.round((job.processed / job.total) * 100) : 0;

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-900">
            {job.status === 'queued' ? 'Starting…' : `Importing ${job.processed} of ${job.total} products`}
          </p>
          <p className="text-sm text-zinc-500">You can leave this page. The import keeps running.</p>
        </div>
        <span className="text-2xl font-semibold text-brand-700 tabular-nums">{percent}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-brand-600 transition-[width] duration-700" style={{ width: `${percent}%` }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600">
        <span>
          {job.created} added · {job.updated} updated · {job.skipped} skipped
          {job.failed > 0 && <span className="text-red-600"> · {job.failed} not imported</span>}
        </span>
        <Button variant="outline" size="sm" onClick={() => setConfirm(true)}>
          Cancel import
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        danger
        loading={cancel.isPending}
        onConfirm={() => cancel.mutate(job.id, { onSuccess: () => setConfirm(false), onError: (err) => toast.error(errorMessage(err)) })}
        title="Cancel this import?"
        description="Products imported so far stay in the shop. The rest are not imported."
        confirmLabel="Cancel import"
      />
    </Card>
  );
}

function ResultPanel({ job }: { job: ImportJob }) {
  return (
    <div className="space-y-4">
      {job.status === 'failed' && <ErrorAlert message={`The import stopped: ${job.error ?? 'unknown error'}`} />}
      {job.status === 'cancelled' && job.processed === 0 && (
        <p className="text-sm text-zinc-600">This import was cancelled before it started. Nothing was imported.</p>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Added" value={job.created} tone="green" />
        <Stat label="Updated" value={job.updated} tone="blue" />
        <Stat label="Skipped" value={job.skipped} tone="gray" />
        <Stat label="Not imported" value={job.failed} tone="red" />
      </div>
      {job.finishedAt && job.startedAt && (
        <p className="text-sm text-zinc-500">
          Finished {formatDateTime(job.finishedAt)} · took {duration(job.startedAt, job.finishedAt)} · {optionsText(job)}
        </p>
      )}
    </div>
  );
}

function duration(from: string, to: string) {
  const seconds = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 1000));
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

const FILTERS: { key: ImportRowFilter; label: string; count?: (job: ImportJob) => number }[] = [
  { key: 'all', label: 'All', count: (j) => j.total },
  { key: 'create', label: 'New', count: (j) => j.preview.create },
  { key: 'update', label: 'Updates', count: (j) => j.preview.update },
  { key: 'skip', label: 'Skipped', count: (j) => j.preview.skip },
  { key: 'error', label: 'Problems', count: (j) => j.preview.error },
  { key: 'failed', label: 'Not imported' },
];

function RowIcon({ row }: { row: ImportRow }) {
  if (row.status === 'done') return <CheckCircle2 className="size-4.5 text-brand-600" aria-label="Done" />;
  if (row.status === 'failed') return <XCircle className="size-4.5 text-red-500" aria-label="Not imported" />;
  if (row.status === 'skipped' || row.action === 'skip') return <CircleSlash className="size-4.5 text-zinc-400" aria-label="Skipped" />;
  if (row.action === 'error') return <AlertTriangle className="size-4.5 text-red-500" aria-label="Problem" />;
  if (row.action === 'update') return <RefreshCw className="size-4.5 text-sky-600" aria-label="Update" />;
  return <Plus className="size-4.5 text-brand-600" aria-label="New" />;
}

function RowsTable({
  data,
  filter,
  onFilter,
  onPage,
  loading,
}: {
  data: ImportDetail;
  filter: ImportRowFilter;
  onFilter: (f: ImportRowFilter) => void;
  onPage: (page: number) => void;
  loading: boolean;
}) {
  const { job, rows, rowsTotal, page, pageSize } = data;
  const pages = Math.max(1, Math.ceil(rowsTotal / pageSize));
  const finished = !['preview', 'queued', 'running'].includes(job.status);
  const filters = FILTERS.filter((f) => f.key !== 'failed' || finished);

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 px-3 pt-2">
        {filters.map((f) => {
          const n = f.key === 'failed' ? job.failed : f.count?.(job);
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilter(f.key)}
              className={cn(
                '-mb-px flex cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap',
                filter === f.key ? 'border-brand-600 text-brand-800' : 'border-transparent text-zinc-500 hover:text-zinc-800',
              )}
            >
              {f.label}
              {n !== undefined && (
                <span className={cn('rounded-full px-1.5 text-xs tabular-nums', filter === f.key ? 'bg-brand-100' : 'bg-zinc-100')}>
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className={cn('overflow-x-auto transition-opacity', loading && 'opacity-60')}>
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
            <tr>
              <th className="w-10 py-3 pl-5" />
              <th className="px-3 py-3">Product</th>
              <th className="hidden px-3 py-3 sm:table-cell">Line</th>
              <th className="px-3 py-3 text-right">Price</th>
              <th className="px-5 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => (
              <tr key={row.id} className={cn(row.action === 'error' || row.status === 'failed' ? 'bg-red-50/30' : undefined)}>
                <td className="py-3 pl-5 align-top">
                  <RowIcon row={row} />
                </td>
                <td className="px-3 py-3 align-top">
                  {row.productId ? (
                    <Link to={`/products/${row.productId}`} className="font-medium text-zinc-900 hover:text-brand-700">
                      {row.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-zinc-900">{row.name}</span>
                  )}
                  <div className="text-xs text-zinc-500">
                    {row.variants > 1 ? `${row.variants} variants` : '1 variant'} · {row.images} image{row.images === 1 ? '' : 's'}
                  </div>
                </td>
                <td className="hidden px-3 py-3 align-top text-zinc-500 tabular-nums sm:table-cell">
                  {row.lines.length > 1 ? `${row.lines[0]}–${row.lines[row.lines.length - 1]}` : row.lines[0]}
                </td>
                <td className="px-3 py-3 text-right align-top whitespace-nowrap tabular-nums">{formatMoney(row.price)}</td>
                <td className="px-5 py-3 align-top">
                  {row.message && (
                    <span
                      className={cn(
                        'flex items-start gap-1.5 text-sm whitespace-pre-line',
                        row.action === 'error' || row.status === 'failed' ? 'text-red-700' : 'text-zinc-600',
                      )}
                    >
                      {row.action !== 'error' && row.status !== 'failed' && <Info className="mt-0.5 size-3.5 shrink-0 text-zinc-400" />}
                      {row.message}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-4 py-12 text-center text-sm text-zinc-500">Nothing here.</p>}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
          <span className="tabular-nums">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rowsTotal)} of {rowsTotal}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon" className="size-8" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
