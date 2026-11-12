import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Copy, ExternalLink, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCopyOldPages, useDeletePage, usePages, useReorderPages, useSavePage, type ContentPage } from '@/hooks/use-pages';
import { ApiError, errorMessage } from '@/lib/api';
import { STORE_URL } from '@/lib/store';
import { formatDateTime, slugify } from '@/lib/utils';
import { SeoFields } from '@/components/catalog/seo-fields';
import { RichTextEditor } from '@/components/products/rich-text-editor';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';
import { SwitchField } from '@/components/ui/switch';

const site = STORE_URL.replace(/\/$/, '');
/** As the shop makes it: like other addresses, but old WordPress underscores are kept (/refund_returns/). */
const addressOf = (slug: string, title: string) =>
  slug.trim()
    ? slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '-')
        .replace(/^[-_]+|[-_]+$/g, '')
    : slugify(title);

/** Content pages: About us, Contact, Terms, Refund and Privacy policies... */
export function PagesPage() {
  const list = usePages();
  const reorder = useReorderPages();
  const remove = useDeletePage();
  const copy = useCopyOldPages();
  const [editing, setEditing] = useState<ContentPage | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<ContentPage | null>(null);

  const move = (i: number, by: number) => {
    const ids = list.data!.items.map((p) => p.id);
    const [moved] = ids.splice(i, 1);
    ids.splice(i + by, 0, moved!);
    reorder.mutate(ids);
  };

  return (
    <div>
      <PageHeader
        title="Pages"
        description="About us, Contact, Terms, Refund and Privacy policies. Published pages are linked in the website footer. Online payment (SSLCommerz) needs Terms, Refund and Privacy pages."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              loading={copy.isPending}
              onClick={() =>
                copy.mutate('https://papertree.com.bd', {
                  onSuccess: (r) => toast.success(r.copied.length ? `Copied as drafts: ${r.copied.join(', ')}` : 'Nothing new to copy'),
                  onError: (err) => toast.error(errorMessage(err)),
                })
              }
              title="The old site's About, Terms... as drafts, with the same addresses"
            >
              <Copy /> Copy from old site
            </Button>
            <Button onClick={() => setEditing('new')}>
              <Plus /> New page
            </Button>
          </div>
        }
      />
      {list.isError ? (
        <LoadError message={errorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <Skeleton className="h-64" />
      ) : !list.data.items.length ? (
        <Card>
          <EmptyState
            icon={<FileText />}
            title="No pages yet"
            description="Copy the old site's pages, or write a new one."
            action={
              <Button onClick={() => setEditing('new')}>
                <Plus /> New page
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="divide-y divide-zinc-100">
          {list.data.items.map((p, i) => (
            <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
              <div className="min-w-0 flex-1 basis-64">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setEditing(p)} className="font-medium text-zinc-900 hover:text-brand-700">
                    {p.title}
                  </button>
                  {p.isPublished ? <Badge variant="green">Published</Badge> : <Badge variant="amber">Draft</Badge>}
                  {p.isPublished && p.showInFooter && <Badge variant="gray">In footer</Badge>}
                </div>
                <div className="text-xs text-zinc-500">
                  <span className="font-mono">/{p.slug}/</span> · changed {formatDateTime(p.updatedAt)}
                </div>
              </div>
              {p.isPublished && (
                <a href={`${site}/${p.slug}/`} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-brand-700" aria-label={`Open ${p.title} on the website`}>
                  <ExternalLink className="size-4" />
                </a>
              )}
              <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${p.title} up`}>
                <ArrowUp />
              </Button>
              <Button variant="ghost" size="icon" disabled={i === list.data.items.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${p.title} down`}>
                <ArrowDown />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setEditing(p)} aria-label={`Edit ${p.title}`}>
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setToDelete(p)} aria-label={`Delete ${p.title}`}>
                <Trash2 />
              </Button>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && <PageForm key={editing === 'new' ? 'new' : editing.id} page={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Dialog>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete “${toDelete?.title}”?`}
        description="Its address shows “not found” afterwards. To hide it for now, make it a draft instead."
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => (toast.success('Page deleted'), setToDelete(null)) })}
      />
    </div>
  );
}

function PageForm({ page, onDone }: { page: ContentPage | null; onDone: () => void }) {
  const save = useSavePage();
  const [f, setF] = useState({
    title: page?.title ?? '',
    slug: page?.slug ?? '',
    body: page?.body ?? '',
    seoTitle: page?.seoTitle ?? '',
    seoDescription: page?.seoDescription ?? '',
    isPublished: page?.isPublished ?? false,
    showInFooter: page?.showInFooter ?? true,
    showContact: page?.showContact ?? false,
  });
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const general = save.error && !(save.error instanceof ApiError && Object.keys(fields).length) ? errorMessage(save.error) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(
      {
        id: page?.id,
        input: {
          title: f.title,
          slug: f.slug.trim() || undefined,
          body: f.body.replace(/<p><\/p>/g, '').trim() || null,
          seoTitle: f.seoTitle.trim() || null,
          seoDescription: f.seoDescription.trim() || null,
          isPublished: f.isPublished,
          showInFooter: f.showInFooter,
          showContact: f.showContact,
        },
      },
      { onSuccess: (saved) => (toast.success(saved.isPublished ? `${saved.title} published` : `${saved.title} saved as a draft`), onDone()) },
    );
  };

  return (
    <DialogContent size="lg" title={page ? page.title : 'New page'} description={page ? `At ${site}/${page.slug}/` : 'Written once, shown on the website at its own address.'}>
      <form onSubmit={submit} noValidate>
        <DialogBody>
          {general && <ErrorAlert message={general} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="pg-title" required error={fields.title}>
              <Input id="pg-title" value={f.title} onChange={(e) => set({ title: e.target.value })} invalid={!!fields.title} maxLength={150} />
            </Field>
            <Field label="Address" htmlFor="pg-slug" error={fields.slug} hint={`/${addressOf(f.slug, f.title) || '…'}/ · changing it later keeps the old address working`}>
              <Input id="pg-slug" value={f.slug} onChange={(e) => set({ slug: e.target.value })} placeholder={slugify(f.title)} invalid={!!fields.slug} className="font-mono" />
            </Field>
          </div>
          <div>
            <div className="mb-1.5 text-sm font-medium text-zinc-800">Text</div>
            <RichTextEditor id="pg-body" value={f.body} onChange={(body) => set({ body })} placeholder="Write the page…" />
          </div>
          <SwitchField id="pg-contact" label="Show the shop's contact details" description="Phone, WhatsApp, email, address and opening hours from Settings, under the text (for a Contact page)." checked={f.showContact} onCheckedChange={(v) => set({ showContact: v })} />
          <SwitchField id="pg-footer" label="Link it in the footer" checked={f.showInFooter} onCheckedChange={(v) => set({ showInFooter: v })} />
          <SwitchField id="pg-published" label="Published" description="Drafts are not on the website." checked={f.isPublished} onCheckedChange={(v) => set({ isPublished: v })} />
          <SeoFields
            idPrefix="page"
            path={`/${addressOf(f.slug, f.title)}/`}
            title={f.seoTitle}
            description={f.seoDescription}
            onTitleChange={(seoTitle) => set({ seoTitle })}
            onDescriptionChange={(seoDescription) => set({ seoDescription })}
            fallbackTitle={f.title}
            fallbackDescription={f.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)}
            errors={fields}
          />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {f.isPublished ? 'Save and publish' : 'Save draft'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
