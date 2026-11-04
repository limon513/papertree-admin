import { useSearchParams } from 'react-router';
import { useSettings } from '@/hooks/use-settings';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { DeliverySection } from '@/components/settings/delivery-section';
import { PaymentsSection } from '@/components/settings/payments-section';
import { StockLocationsSection } from '@/components/settings/stock-locations-section';
import { StoreSection } from '@/components/settings/store-section';
import { LoadError, Skeleton } from '@/components/ui/misc';

const TABS = [
  { key: 'store', label: 'Store details' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'payments', label: 'Payments & wholesale' },
  { key: 'locations', label: 'Stock locations' },
] as const;

type Tab = (typeof TABS)[number]['key'];

export function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.some((t) => t.key === params.get('tab')) ? (params.get('tab') as Tab) : 'store';
  const settings = useSettings();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Store details, delivery charges, payments and stock locations." />

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-zinc-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setParams(t.key === 'store' ? {} : { tab: t.key }, { replace: true })}
            className={cn(
              '-mb-px border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
              tab === t.key ? 'border-brand-600 text-brand-800' : 'border-transparent text-zinc-500 hover:text-zinc-800',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'delivery' ? (
        <DeliverySection />
      ) : tab === 'locations' ? (
        <StockLocationsSection />
      ) : settings.isError ? (
        <LoadError message={errorMessage(settings.error)} onRetry={() => settings.refetch()} />
      ) : settings.isPending ? (
        <Skeleton className="h-96" />
      ) : tab === 'payments' ? (
        <PaymentsSection data={settings.data} />
      ) : (
        <StoreSection data={settings.data} />
      )}
    </div>
  );
}
