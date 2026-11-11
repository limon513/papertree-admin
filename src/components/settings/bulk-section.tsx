import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useSaveCheckout } from '@/hooks/use-settings';
import type { CheckoutSettings, SettingsResponse } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { BulkTiersEditor, fromTierForms, toTierForms, type TierForm } from './bulk-tiers';
import { SaveBar, saveErrors, Section } from './shared';

const toForm = (c: CheckoutSettings) => ({ enabled: c.bulk.enabled, onSale: c.bulk.onSale, tiers: toTierForms(c.bulk.tiers) });
/** For "unsaved changes": the keys of the rows do not count. */
const plain = (f: { enabled: boolean; onSale: boolean; tiers: TierForm[] }) => JSON.stringify({ ...f, tiers: f.tiers.map((t) => [t.minQuantity, t.percent]) });

/** Settings > Bulk discounts: buy more, pay less per piece (retail). */
export function BulkSection({ data }: { data: SettingsResponse }) {
  const save = useSaveCheckout();
  const [form, setForm] = useState(() => toForm(data.checkout));
  const dirty = plain(form) !== plain(toForm(data.checkout));
  const { fields, general } = saveErrors(save.error);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // The whole checkout setting is saved, so the payment settings go along unchanged.
    save.mutate(
      { ...data.checkout, bulk: { enabled: form.enabled, onSale: form.onSale, tiers: fromTierForms(form.tiers) } },
      {
        onSuccess: (saved) => {
          setForm(toForm(saved));
          toast.success('Bulk discounts saved');
        },
      },
    );
  };

  return (
    <form onSubmit={submit}>
      <Card>
        <CardContent className="pt-6">
          <Section
            title="Bulk discounts"
            description="Buy more, pay less per piece. For retail orders (wholesale has its own prices), on the website and on orders you take. Shown in the cart and at checkout, not on product pages."
          >
            <label className="flex cursor-pointer items-start gap-3">
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} aria-label="Give bulk discounts" className="mt-0.5" />
              <span className="text-sm">
                <span className="font-medium text-zinc-800">Give bulk discounts</span>
                <span className="block text-zinc-500">Off: no bulk discount anywhere, not even products with their own steps.</span>
              </span>
            </label>
          </Section>
          <Section
            title="Steps for all products"
            description="Pieces of all options of a product count together: 6 red + 6 blue pens = 12. A product can have its own steps or none (on its page)."
          >
            <BulkTiersEditor
              idPrefix="bulk"
              value={form.tiers}
              onChange={(tiers) => setForm({ ...form, tiers })}
              errorAt={(i, f) => fields[`bulk.tiers.${i}.${f}`] ?? (i === 0 ? fields['bulk.tiers'] : undefined)}
            />
          </Section>
          <Section title="Items on sale" description="Products that already have a sale price.">
            <label className="flex cursor-pointer items-start gap-3">
              <Switch checked={form.onSale} onCheckedChange={(v) => setForm({ ...form, onSale: v })} aria-label="Bulk discount on sale items too" className="mt-0.5" />
              <span className="text-sm">
                <span className="font-medium text-zinc-800">Also on items already on sale</span>
                <span className="block text-zinc-500">Off: sale items keep their sale price, with no extra discount.</span>
              </span>
            </label>
          </Section>
          <SaveBar
            dirty={dirty}
            saving={save.isPending}
            error={general}
            onReset={() => {
              setForm(toForm(data.checkout));
              save.reset();
            }}
          />
        </CardContent>
      </Card>
    </form>
  );
}
