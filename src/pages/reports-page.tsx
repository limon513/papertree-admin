import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ExternalLink, Plus, SearchX } from 'lucide-react';
import { canOpen, useMe } from '@/hooks/use-auth';
import { useSearchReport } from '@/hooks/use-search';
import { errorMessage } from '@/lib/api';
import { STORE_URL } from '@/lib/store';
import type { SearchReportRow } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadError, Skeleton } from '@/components/ui/misc';

const PERIODS = [7, 30, 90] as const;

/** Reports. For now: what shoppers search for on the website. */
export function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const days = PERIODS.find((d) => String(d) === params.get('days')) ?? 30;
  const report = useSearchReport(days);
  const me = useMe();
  const canEditWords = !!me.data && canOpen(me.data.admin, 'products');
  const data = report.data;
  const t = data?.totals;
  const share = (n: number) => (t && t.searches ? `${Math.round((n / t.searches) * 100)}% of searches` : '');

  return (
    <div>
      <PageHeader
        title="Reports"
        description="What shoppers search for on the website. Searches that find nothing show what to stock, or a word to add to Search words."
        actions={
          <div className="flex rounded-lg bg-zinc-200/60 p-0.5" role="group" aria-label="Period">
            {PERIODS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setParams(d === 30 ? {} : { days: String(d) })}
                aria-pressed={days === d}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  days === d ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900',
                )}
              >
                {d} days
              </button>
            ))}
          </div>
        }
      />

      {report.isError ? (
        <Card>
          <LoadError message={errorMessage(report.error)} onRetry={() => report.refetch()} />
        </Card>
      ) : (
        <div className={cn('space-y-6 transition-opacity', report.isPlaceholderData && 'opacity-60')}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Searches" value={t?.searches} />
            <Stat label="Different searches" value={t?.different} />
            <Stat label="Found nothing" value={t?.noResults} note={t ? share(t.noResults) : ''} warn={!!t?.noResults} />
            <Stat label="Typos fixed" value={t?.corrected} note={t ? share(t.corrected) : ''} />
          </div>

          <ReportTable
            title="Found nothing"
            description="Shoppers looked for these and saw no products. Stock them, or add the word to a search word group."
            rows={data?.noResults}
            loading={report.isPending}
            empty="Every search found something."
            right={(r) => (
              <div className="flex justify-end gap-1">
                <a href={`${STORE_URL}/search/?q=${encodeURIComponent(r.query)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">
                  <ExternalLink className="size-3.5" /> Try it
                </a>
                {canEditWords && (
                  <Link to={`/search-words?add=${encodeURIComponent(r.query)}`} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-brand-700 hover:bg-brand-50">
                    <Plus className="size-3.5" /> Search word
                  </Link>
                )}
              </div>
            )}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <ReportTable
              title="Most searched"
              description="With how many products the last search found."
              rows={data?.top}
              loading={report.isPending}
              empty="No searches yet."
              right={(r) => (r.results === 0 ? <Badge variant="red">none found</Badge> : <span className="text-zinc-500 tabular-nums">{r.results} found</span>)}
            />
            <ReportTable
              title="Typos fixed"
              description="Search fixed these spellings by itself. A word fixed wrongly is worth adding to a search word group."
              rows={data?.corrected}
              loading={report.isPending}
              empty="No spelling fixes needed."
              right={(r) => (
                <span className="text-zinc-500">
                  → <span className="font-medium text-zinc-800">{r.correctedTo}</span>
                </span>
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, note, warn = false }: { label: string; value: number | undefined; note?: string; warn?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      {value === undefined ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className={cn('mt-1 text-2xl font-semibold tabular-nums', warn ? 'text-amber-700' : 'text-zinc-900')}>{value.toLocaleString('en-US')}</p>
      )}
      {note && <p className="mt-0.5 text-xs text-zinc-500">{note}</p>}
    </Card>
  );
}

function ReportTable<T extends SearchReportRow>({
  title,
  description,
  rows,
  loading,
  empty,
  right,
}: {
  title: string;
  description: string;
  rows: T[] | undefined;
  loading: boolean;
  empty: string;
  right: (row: T) => ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 px-5 pb-5">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !rows?.length ? (
          <div className="flex items-center gap-2 px-5 pb-6 text-sm text-zinc-500">
            <SearchX className="size-4" /> {empty}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th className="px-5 py-2">Search</th>
                  <th className="px-3 py-2 text-right">Times</th>
                  <th className="hidden px-3 py-2 sm:table-cell">Last</th>
                  <th className="px-5 py-2 text-right">
                    <span className="sr-only">More</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((r) => (
                  <tr key={r.query} className="hover:bg-zinc-50/70">
                    <td className="px-5 py-2 font-medium text-zinc-900">{r.query}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.searches}</td>
                    <td className="hidden px-3 py-2 whitespace-nowrap text-zinc-500 sm:table-cell">{timeAgo(r.lastAt)}</td>
                    <td className="px-5 py-2 text-right whitespace-nowrap">{right(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
