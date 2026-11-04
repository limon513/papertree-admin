import { Loader2 } from 'lucide-react';
import type { ImportJob, ImportStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const INFO: Record<ImportStatus, { label: string; variant: 'gray' | 'blue' | 'green' | 'red' | 'amber' }> = {
  preview: { label: 'Waiting to start', variant: 'amber' },
  queued: { label: 'Starting', variant: 'blue' },
  running: { label: 'Importing', variant: 'blue' },
  done: { label: 'Finished', variant: 'green' },
  failed: { label: 'Stopped', variant: 'red' },
  cancelled: { label: 'Cancelled', variant: 'gray' },
};

export function ImportStatusBadge({ status }: { status: ImportStatus }) {
  const info = INFO[status];
  return (
    <Badge variant={info.variant}>
      {(status === 'queued' || status === 'running') && <Loader2 className="animate-spin" />}
      {info.label}
    </Badge>
  );
}

export const FORMAT_LABEL: Record<ImportJob['format'], string> = {
  papertree: 'PaperTree template',
  woocommerce: 'WooCommerce export',
  daraz: 'Daraz export',
  link: 'Product link',
};

/** The file name, or the site for a product link ("daraz.com.bd"). */
export function jobTitle(job: ImportJob) {
  if (job.format !== 'link') return job.fileName;
  try {
    return new URL(job.fileName).hostname.replace(/^www\./, '');
  } catch {
    return job.fileName;
  }
}
