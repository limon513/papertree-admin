import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useSampleSms, useSaveMessages } from '@/hooks/use-settings';
import { MESSAGE_EVENTS, type MessageEvent, type MessagesSettings, type SettingsResponse } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { SaveBar, saveErrors, Section } from './shared';

type Row = MessageEvent | 'businessApproved';
const ROWS: Row[] = [...MESSAGE_EVENTS, 'businessApproved'];

const EVENTS: Record<Row, { label: string; when: string }> = {
  placed: { label: 'Order placed', when: 'A shopper places an order on the website. (We call them to confirm anyway.)' },
  confirmed: { label: 'Confirmed', when: 'You mark the order confirmed.' },
  shipped: { label: 'On the way', when: 'You mark it shipped. Includes the courier and tracking code.' },
  delivered: { label: 'Delivered', when: 'You mark it delivered. A thank-you.' },
  cancelled: { label: 'Cancelled', when: 'You cancel the order.' },
  businessApproved: { label: 'Business approved', when: 'You approve a business account: they can now buy at wholesale prices.' },
};

/** Settings > Customer messages: which SMS and emails customers get as their order moves on. */
export function MessagesSection({ data }: { data: SettingsResponse }) {
  const save = useSaveMessages();
  const samples = useSampleSms();
  const [form, setForm] = useState<MessagesSettings>(data.messages);
  const dirty = JSON.stringify(form) !== JSON.stringify(data.messages);
  const { general } = saveErrors(save.error);
  // The most SMS one order can send: it either goes all the way or is cancelled on the way.
  const onPath = (events: MessageEvent[]) => events.filter((e) => form[e].sms).length;
  const smsCount = Math.max(onPath(['placed', 'confirmed', 'shipped', 'delivered']), onPath(['placed', 'confirmed', 'cancelled']));

  const set = (event: Row, channel: 'sms' | 'email', on: boolean) => setForm({ ...form, [event]: { ...form[event], [channel]: on } });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form, {
      onSuccess: (saved) => {
        setForm(saved);
        toast.success('Customer messages saved');
      },
    });
  };

  return (
    <form onSubmit={submit}>
      <Card>
        <CardContent className="pt-6">
          <Section
            title="Customer messages"
            description={
              <>
                What customers hear as their order moves on. Each message goes once per order, about a minute after you change the status, so a wrong
                click can be undone first. Email goes only to customers who gave an email address.{' '}
                <span className="block mt-2">
                  The SMS and email accounts are set in <Link to="/integrations" className="font-medium text-brand-700 hover:underline">Integrations</Link>.
                </span>
              </>
            }
          >
            <div className="overflow-hidden rounded-lg ring-1 ring-zinc-200">
              <div className="grid grid-cols-[minmax(0,1fr)_64px_64px] items-center gap-2 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-500 uppercase">
                <span>When</span>
                <span className="text-center">SMS</span>
                <span className="text-center">Email</span>
              </div>
              {ROWS.map((event) => (
                <div key={event} className="border-t border-zinc-200 px-4 py-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_64px_64px] items-center gap-2">
                    <span className="text-sm">
                      <span className="font-medium text-zinc-800">{EVENTS[event].label}</span>
                      <span className="block text-zinc-500">{EVENTS[event].when}</span>
                    </span>
                    <span className="flex justify-center">
                      <Switch checked={form[event].sms} onCheckedChange={(v) => set(event, 'sms', v)} aria-label={`${EVENTS[event].label}: SMS`} />
                    </span>
                    <span className="flex justify-center">
                      <Switch checked={form[event].email} onCheckedChange={(v) => set(event, 'email', v)} aria-label={`${EVENTS[event].label}: email`} />
                    </span>
                  </div>
                  {form[event].sms && samples.data && (
                    <p className="mt-2 rounded-md bg-zinc-50 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-600">
                      {samples.data[event]}
                      <span className="ml-2 font-sans text-zinc-400">({samples.data[event].length} letters, 1 SMS)</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-zinc-500">
              Each SMS costs money: {smsCount === 0 ? 'no SMS are sent.' : `one order sends at most ${smsCount}.`} SMS are written in
              English letters only (Bangla letters make each SMS cost about twice as much). When you change a status you can untick “Tell the customer” to send
              nothing.
            </p>
          </Section>
          <SaveBar
            dirty={dirty}
            saving={save.isPending}
            error={general}
            onReset={() => {
              setForm(data.messages);
              save.reset();
            }}
          />
        </CardContent>
      </Card>
    </form>
  );
}
