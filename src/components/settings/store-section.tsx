import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useSaveStore } from '@/hooks/use-settings';
import type { Media, SettingsResponse, StoreSettings } from '@/lib/types';
import { ImageBox } from '@/components/catalog/picture-field';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { SaveBar, saveErrors, Section } from './shared';

type Form = Record<Exclude<keyof StoreSettings, 'logoImageId'>, string>;

const toForm = (s: StoreSettings): Form => ({
  name: s.name,
  tagline: s.tagline ?? '',
  phone: s.phone ?? '',
  whatsapp: s.whatsapp ?? '',
  email: s.email ?? '',
  address: s.address ?? '',
  openingHours: s.openingHours ?? '',
  facebook: s.facebook ?? '',
  instagram: s.instagram ?? '',
  youtube: s.youtube ?? '',
  tiktok: s.tiktok ?? '',
});

const SOCIAL = [
  { key: 'facebook', label: 'Facebook page', placeholder: 'https://www.facebook.com/…' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://www.instagram.com/…' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://www.youtube.com/@…' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://www.tiktok.com/@…' },
] as const;

export function StoreSection({ data }: { data: SettingsResponse }) {
  const save = useSaveStore();
  const [form, setForm] = useState(() => toForm(data.store));
  const [logo, setLogo] = useState<Media | null>(data.logo);

  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(data.store)) || (logo?.id ?? null) !== data.store.logoImageId;
  const { fields, general } = saveErrors(save.error);
  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const empty = (v: string) => v.trim() || null;
    save.mutate(
      {
        name: form.name,
        tagline: empty(form.tagline),
        phone: empty(form.phone),
        whatsapp: empty(form.whatsapp),
        email: empty(form.email),
        address: empty(form.address),
        openingHours: empty(form.openingHours),
        logoImageId: logo?.id ?? null,
        facebook: empty(form.facebook),
        instagram: empty(form.instagram),
        youtube: empty(form.youtube),
        tiktok: empty(form.tiktok),
      },
      {
        // Show the cleaned values (e.g. phone numbers without spaces).
        onSuccess: (saved) => {
          setForm(toForm(saved));
          toast.success('Store details saved');
        },
      },
    );
  };

  return (
    <form onSubmit={submit}>
      <Card>
        <CardContent className="pt-6">
          <Section title="Shop" description="Shown in the website header, footer and on invoices.">
            <Field label="Shop name" htmlFor="store-name" error={fields.name} required>
              <Input id="store-name" value={form.name} onChange={set('name')} invalid={!!fields.name} maxLength={100} />
            </Field>
            <Field label="Tagline" htmlFor="store-tagline" error={fields.tagline} hint="A short line under the name, e.g. on Google.">
              <Input id="store-tagline" value={form.tagline} onChange={set('tagline')} maxLength={150} />
            </Field>
            <div className="max-w-sm">
              <ImageBox label="Logo" image={logo} onChange={setLogo} />
              {fields.logoImageId && <p className="mt-1.5 text-sm text-red-600">{fields.logoImageId}</p>}
            </div>
          </Section>

          <Section title="Contact" description="How customers reach you. The phone and WhatsApp numbers appear on every page.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone" htmlFor="store-phone" error={fields.phone} hint="e.g. 01712345678">
                <Input id="store-phone" type="tel" value={form.phone} onChange={set('phone')} invalid={!!fields.phone} />
              </Field>
              <Field label="WhatsApp" htmlFor="store-whatsapp" error={fields.whatsapp} hint="For the chat button">
                <Input id="store-whatsapp" type="tel" value={form.whatsapp} onChange={set('whatsapp')} invalid={!!fields.whatsapp} />
              </Field>
            </div>
            <Field label="Email" htmlFor="store-email" error={fields.email}>
              <Input id="store-email" type="email" value={form.email} onChange={set('email')} invalid={!!fields.email} />
            </Field>
            <Field label="Address" htmlFor="store-address" error={fields.address}>
              <Textarea id="store-address" rows={2} value={form.address} onChange={set('address')} maxLength={500} />
            </Field>
            <Field label="Opening hours" htmlFor="store-hours" error={fields.openingHours} hint="e.g. Sat–Thu, 10am–8pm">
              <Input id="store-hours" value={form.openingHours} onChange={set('openingHours')} maxLength={200} />
            </Field>
          </Section>

          <Section title="Social media" description="Links in the website footer. Leave empty to hide one.">
            <div className="grid gap-4 sm:grid-cols-2">
              {SOCIAL.map((s) => (
                <Field key={s.key} label={s.label} htmlFor={`store-${s.key}`} error={fields[s.key]}>
                  <Input
                    id={`store-${s.key}`}
                    type="url"
                    placeholder={s.placeholder}
                    value={form[s.key]}
                    onChange={set(s.key)}
                    invalid={!!fields[s.key]}
                  />
                </Field>
              ))}
            </div>
          </Section>
          <SaveBar
            dirty={dirty}
            saving={save.isPending}
            error={general}
            onReset={() => {
              setForm(toForm(data.store));
              setLogo(data.logo);
              save.reset();
            }}
          />
        </CardContent>
      </Card>
    </form>
  );
}
