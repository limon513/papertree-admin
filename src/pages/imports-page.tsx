import { useRef, useState, type DragEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Download, FileSpreadsheet, FileUp, History } from 'lucide-react';
import { useImports, useUploadImport, type ImportOptions } from '@/hooks/use-imports';
import { API_URL, ApiError, errorMessage } from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import { FORMAT_LABEL, ImportStatusBadge } from '@/components/imports/import-status';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/input';
import { EmptyState, ErrorAlert, LoadError, Skeleton, Spinner } from '@/components/ui/misc';

const MAX_MB = 20;

export function ImportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Imports"
        description="Add or update many products at once from a CSV file."
        actions={
          <Button variant="outline" asChild>
            <a href={`${API_URL}/v1/admin/imports/template.csv`} download>
              <Download /> Download template
            </a>
          </Button>
        }
      />
      <UploadCard />
      <HistoryCard />
    </div>
  );
}

function UploadCard() {
  const navigate = useNavigate();
  const upload = useUploadImport();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [options, setOptions] = useState<ImportOptions>({ existing: 'skip', status: 'file', createMissing: true });

  const start = (file: File | undefined) => {
    if (!file) return;
    upload.reset();
    if (file.size > MAX_MB * 1024 * 1024) return setLocalError(`The file is too big. The limit is ${MAX_MB} MB.`);
    setLocalError(null);
    upload.mutate({ file, options }, { onSuccess: (job) => navigate(`/imports/${job.id}`) });
  };

  const error =
    localError ??
    (upload.error instanceof ApiError ? (upload.error.fields.file ?? upload.error.message) : upload.error ? errorMessage(upload.error) : null);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    start(e.dataTransfer.files[0]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import a file</CardTitle>
        <CardDescription>
          Use our template, or the file from WooCommerce (Products → Export) to move products from the old website. Nothing is
          imported until you have checked the file.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              start(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex h-full min-h-48 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 text-center transition-colors',
              dragging ? 'border-brand-400 bg-brand-50/60' : 'border-zinc-300 hover:border-brand-400 hover:bg-brand-50/30',
            )}
          >
            {upload.isPending ? (
              <>
                <Spinner className="size-7" />
                <span className="text-sm font-medium text-zinc-700">Checking the file…</span>
                <span className="text-xs text-zinc-500">Every product is checked before anything is imported.</span>
              </>
            ) : (
              <>
                <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <FileUp className="size-6" />
                </span>
                <span className="text-sm font-medium text-zinc-800">Choose a CSV file or drop it here</span>
                <span className="text-xs text-zinc-500">
                  Up to {MAX_MB} MB and 5,000 products. From Excel: File → Save As → CSV.
                </span>
              </>
            )}
          </button>
          {error && <ErrorAlert className="mt-3" message={error} />}
        </div>

        <div className="space-y-4">
          <Field
            label="Products already in the shop (same SKU)"
            htmlFor="import-existing"
            hint={
              options.existing === 'update'
                ? 'Prices and stock are updated from the file. Names, pictures and descriptions stay as they are.'
                : 'Lines with a SKU we already have are left out.'
            }
          >
            <Select
              id="import-existing"
              value={options.existing}
              onChange={(e) => setOptions({ ...options, existing: e.target.value as ImportOptions['existing'] })}
            >
              <option value="skip">Skip them</option>
              <option value="update">Update price and stock</option>
            </Select>
          </Field>
          <Field
            label="New products"
            htmlFor="import-status"
            hint={options.status === 'draft' ? 'Check them, then publish from the products list.' : undefined}
          >
            <Select
              id="import-status"
              value={options.status}
              onChange={(e) => setOptions({ ...options, status: e.target.value as ImportOptions['status'] })}
            >
              <option value="file">Published or draft, as in the file</option>
              <option value="draft">Always draft (not on the website yet)</option>
            </Select>
          </Field>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-zinc-700">
            <Checkbox
              checked={options.createMissing}
              onCheckedChange={(v) => setOptions({ ...options, createMissing: v === true })}
              className="mt-0.5"
            />
            <span>
              Create categories and brands that don't exist yet
              <span className="block text-xs text-zinc-500">When off, products with unknown ones are not imported.</span>
            </span>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryCard() {
  const imports = useImports();
  const items = imports.data?.items ?? [];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Recent imports</CardTitle>
      </CardHeader>
      {imports.isError ? (
        <LoadError message={errorMessage(imports.error)} onRetry={() => imports.refetch()} />
      ) : imports.isPending ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<History />} title="No imports yet" description="Your imports will be listed here." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
              <tr>
                <th className="px-5 py-3">File</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Result</th>
                <th className="hidden px-5 py-3 md:table-cell">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((job) => (
                <tr key={job.id} className="hover:bg-zinc-50/70">
                  <td className="px-5 py-3">
                    <Link to={`/imports/${job.id}`} className="flex items-center gap-3">
                      <FileSpreadsheet className="size-5 shrink-0 text-zinc-400" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-zinc-900 hover:text-brand-700">{job.fileName}</span>
                        <span className="block text-xs text-zinc-500">
                          {FORMAT_LABEL[job.format]} · {job.total} product{job.total === 1 ? '' : 's'}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <ImportStatusBadge status={job.status} />
                  </td>
                  <td className="px-3 py-3 text-zinc-600">
                    {job.status === 'preview' ? (
                      <span>
                        {job.preview.create} new · {job.preview.update} updates
                        {job.preview.error > 0 && <span className="text-red-600"> · {job.preview.error} with problems</span>}
                      </span>
                    ) : job.status === 'queued' || job.status === 'running' ? (
                      <span className="tabular-nums">
                        {job.processed} of {job.total}
                      </span>
                    ) : (
                      <span>
                        {job.created} added · {job.updated} updated
                        {job.failed > 0 && <span className="text-red-600"> · {job.failed} not imported</span>}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-5 py-3 whitespace-nowrap text-zinc-500 md:table-cell">
                    {job.createdBy?.name ?? '—'} · {timeAgo(job.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
