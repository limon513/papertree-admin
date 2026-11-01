import { cn } from '@/lib/utils';

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill={light ? '#ffffff' : '#1d5b2c'} />
        <path d="M16 6c-4 4-7 7-7 11a7 7 0 0 0 14 0c0-4-3-7-7-11Z" fill={light ? '#58ab66' : '#8dca96'} />
        <path d="M16 12v14" stroke={light ? '#ffffff' : '#1d5b2c'} strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="leading-tight">
        <div className={cn('text-[15px] font-bold tracking-tight', light ? 'text-white' : 'text-zinc-900')}>PaperTree</div>
        <div className={cn('text-[11px] font-medium tracking-wide', light ? 'text-brand-200' : 'text-zinc-500')}>
          Admin Panel
        </div>
      </div>
    </div>
  );
}
