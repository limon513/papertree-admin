import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useSaveCheckout } from '@/hooks/use-settings';
import type { CheckoutSettings, SettingsResponse, WholesaleDelivery } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { AddonInput, Select, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SaveBar, saveErrors, Section, toNumber, toText } from './shared';

const DELIVERY_OPTIONS: { value: WholesaleDelivery; label: string; hint: string }[] = [
  { value: 'retail', label: 'Same as retail orders', hint: 'The delivery zones decide the charge.' },
  { value: 'fixed', label: 'A fixed charge', hint: 'Every wholesale order pays the same charge.' },
  { value: 'free', label: 'Free delivery', hint: 'You pay the courier.' },
  { value: 'paid_on_delivery', label: 'Customer pays the courier', hint: 'No charge at checkout; the customer pays the courier on delivery.' },
];

const toForm = (c: CheckoutSettings) => ({
  codEnabled: c.cod.enabled,
  codMax: toText(c.cod.maxAmount),
  advance: toText(c.wholesale.advancePercent),
  minOrder: toText(c.wholesale.minOrderAmount),
  delivery: c.wholesale.delivery,
  deliveryFee: toText(c.wholesale.deliveryFee),
  terms: c.wholesale.terms ?? '',
});

export function PaymentsSection({ data }: { data: SettingsResponse }) {
  const save = useSaveCheckout();
  const [form, setForm] = useState(() => toForm(data.checkout));
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(data.checkout));
  const { fields, general } = saveErrors(save.error);
  const option = DELIVERY_OPTIONS.find((o) => o.value === form.delivery)!;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(
      {
        cod: { enabled: form.codEnabled, maxAmount: toNumber(form.codMax) },
        wholesale: {
          advancePercent: toNumber(form.advance) ?? 0,
          minOrderAmount: toNumber(form.minOrder),
          delivery: form.delivery,
          deliveryFee: form.delivery === 'fixed' ? toNumber(form.deliveryFee) : null,
          terms: form.terms.trim() || null,
        },
        // Saved with the rest of the checkout setting: kept as it is.
        bulk: data.checkout.bulk,
      },
      {
        onSuccess: (saved) => {
          setForm(toForm(saved));
          toast.success('Payment settings saved');
        },
      },
    );
  };

  return (
    <form onSubmit={submit}>
      <Card>
        <CardContent className="pt-6">
          <Section
            title="Cash on delivery"
            description="Online payment (SSLCommerz) is set up with the checkout, in a later step."
          >
            <label className="flex cursor-pointer items-start gap-3">
              <Switch
                checked={form.codEnabled}
                onCheckedChange={(v) => setForm({ ...form, codEnabled: v })}
                aria-label="Allow cash on delivery"
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="font-medium text-zinc-800">Allow cash on delivery</span>
                <span className="block text-zinc-500">Customers pay the courier when the order arrives.</span>
              </span>
            </label>
            {form.codEnabled && (
              <Field
                label="Largest order for cash on delivery"
                htmlFor="cod-max"
                error={fields['cod.maxAmount']}
                hint="Bigger orders must be paid online. Leave empty for no limit."
                className="max-w-xs"
              >
                <AddonInput
                  id="cod-max"
                  prefix="৳"
                  inputMode="decimal"
                  value={form.codMax}
                  onChange={(e) => setForm({ ...form, codMax: e.target.value })}
                  invalid={!!fields['cod.maxAmount']}
                />
              </Field>
            )}
          </Section>

          <Section
            title="Wholesale orders"
            description="For business customers. A business can get its own terms later, on its customer page."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Advance payment"
                htmlFor="ws-advance"
                error={fields['wholesale.advancePercent']}
                hint="Paid before the order is sent; the rest is cash on delivery."
              >
                <AddonInput
                  id="ws-advance"
                  suffix="%"
                  inputMode="decimal"
                  value={form.advance}
                  onChange={(e) => setForm({ ...form, advance: e.target.value })}
                  invalid={!!fields['wholesale.advancePercent']}
                />
              </Field>
              <Field
                label="Minimum order"
                htmlFor="ws-min"
                error={fields['wholesale.minOrderAmount']}
                hint="Leave empty for no minimum."
              >
                <AddonInput
                  id="ws-min"
                  prefix="৳"
                  inputMode="decimal"
                  value={form.minOrder}
                  onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                  invalid={!!fields['wholesale.minOrderAmount']}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Delivery charge" htmlFor="ws-delivery" hint={option.hint}>
                <Select
                  id="ws-delivery"
                  value={form.delivery}
                  onChange={(e) => setForm({ ...form, delivery: e.target.value as WholesaleDelivery })}
                >
                  {DELIVERY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              {form.delivery === 'fixed' && (
                <Field label="Fixed charge" htmlFor="ws-fee" error={fields['wholesale.deliveryFee']} required>
                  <AddonInput
                    id="ws-fee"
                    prefix="৳"
                    inputMode="decimal"
                    value={form.deliveryFee}
                    onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })}
                    invalid={!!fields['wholesale.deliveryFee']}
                  />
                </Field>
              )}
            </div>
            <Field
              label="Terms shown at checkout"
              htmlFor="ws-terms"
              error={fields['wholesale.terms']}
              hint="e.g. payment, returns or delivery times for business orders."
            >
              <Textarea
                id="ws-terms"
                rows={3}
                value={form.terms}
                onChange={(e) => setForm({ ...form, terms: e.target.value })}
                maxLength={2000}
              />
            </Field>
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
