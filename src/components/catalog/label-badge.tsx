import { LABEL_STYLE, type LabelColor } from '@/hooks/use-labels';
import { cn } from '@/lib/utils';

/** A website tag as shoppers see it. */
export function LabelBadge({ name, color, className }: { name: string; color: LabelColor; className?: string }) {
  return <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold tracking-wide uppercase', LABEL_STYLE[color], className)}>{name}</span>;
}
