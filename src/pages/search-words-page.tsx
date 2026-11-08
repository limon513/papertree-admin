import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Pencil, Plus, Search, Trash2, WholeWord } from 'lucide-react';
import { toast } from 'sonner';
import { useDeleteSynonym, useSaveSynonym, useSynonyms } from '@/hooks/use-search';
import { ApiError, errorMessage } from '@/lib/api';
import type { SynonymGroup } from '@/lib/types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';
import { TagsInput } from '@/components/ui/tags-input';

type FormState = { group: SynonymGroup | null; start: string[] } | null;

/**
 * Search words (synonyms): words shoppers use for the same thing. A search for any word in a group
 * finds products named with any other ("khata" finds notebooks).
 * Opened with ?add=word (from the search report), the new-group form starts with that word.
 */
export function SearchWordsPage() {
  const synonyms = useSynonyms();
  const remove = useDeleteSynonym();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<FormState>(null);
  const [toDelete, setToDelete] = useState<SynonymGroup | null>(null);

  // From the search report: "Add as a search word".
  useEffect(() => {
    const add = params.get('add');
    if (!add) return;
    setForm({ group: null, start: [add.toLowerCase()] });
    setParams({}, { replace: true });
  }, [params, setParams]);

  const groups = synonyms.data ?? [];
  const query = search.trim().toLowerCase();
  const rows = useMemo(() => (query ? groups.filter((g) => g.terms.some((t) => t.includes(query))) : groups), [groups, query]);

  return (
    <div>
      <PageHeader
        title="Search words"
        description="Words shoppers use for the same thing. Searching any word in a group finds products named with the others, so “khata” finds notebooks. Changes reach the website search within 5 minutes."
        actions={
          <Button onClick={() => setForm({ group: null, start: [] })}>
            <Plus /> New group
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {synonyms.isError ? (
          <LoadError message={errorMessage(synonyms.error)} onRetry={() => synonyms.refetch()} />
        ) : !synonyms.isPending && groups.length === 0 ? (
          <EmptyState
            icon={<WholeWord />}
            title="No search words yet"
            description="Add words customers use for the same thing, like Banglish names (khata, kolom) or common misspellings."
            action={
              <Button onClick={() => setForm({ group: null, start: [] })}>
                <Plus /> New group
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50/70 px-4 py-3">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a word" className="h-9 pl-9" aria-label="Find a word" />
              </div>
              <span className="ml-auto shrink-0 text-sm text-zinc-500">{synonyms.isPending ? '' : `${rows.length} group${rows.length === 1 ? '' : 's'}`}</span>
            </div>
            <ul className="divide-y divide-zinc-100">
              {synonyms.isPending
                ? Array.from({ length: 6 }, (_, i) => (
                    <li key={i} className="flex gap-2 px-4 py-3.5">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-24" />
                    </li>
                  ))
                : rows.map((g) => (
                    <li key={g.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50/70">
                      <button type="button" onClick={() => setForm({ group: g, start: g.terms })} className="flex min-w-0 flex-1 cursor-pointer flex-wrap gap-1.5 text-left" aria-label={`Edit ${g.terms[0]}`}>
                        {g.terms.map((t, i) => (
                          <span
                            key={t}
                            className={
                              i === 0
                                ? 'rounded-md bg-brand-50 px-2 py-0.5 text-sm font-medium text-brand-800 ring-1 ring-brand-200 ring-inset'
                                : 'rounded-md bg-zinc-100 px-2 py-0.5 text-sm text-zinc-700 ring-1 ring-zinc-200 ring-inset'
                            }
                          >
                            {t}
                          </span>
                        ))}
                      </button>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setForm({ group: g, start: g.terms })} aria-label={`Edit ${g.terms[0]}`}>
                          <Pencil />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setToDelete(g)} aria-label={`Delete ${g.terms[0]}`}>
                          <Trash2 />
                        </Button>
                      </div>
                    </li>
                  ))}
              {!synonyms.isPending && rows.length === 0 && <li className="px-4 py-10 text-center text-sm text-zinc-500">No group has “{search.trim()}”.</li>}
            </ul>
          </>
        )}
      </Card>

      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        {form && <GroupForm key={form.group?.id ?? 'new'} group={form.group} start={form.start} onDone={() => setForm(null)} />}
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this group?"
        description={toDelete ? `Searches for “${toDelete.terms.join('”, “')}” will only find products with that exact word.` : ''}
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success('Group deleted');
              setToDelete(null);
            },
            onError: (err) => toast.error(errorMessage(err)),
          })
        }
      />
    </div>
  );
}

function GroupForm({ group, start, onDone }: { group: SynonymGroup | null; start: string[]; onDone: () => void }) {
  const save = useSaveSynonym();
  const [terms, setTerms] = useState(start);
  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const generalError = save.isError && Object.keys(fields).length === 0 ? errorMessage(save.error) : null;
  const termsError = Object.entries(fields).find(([key]) => key.startsWith('terms'))?.[1];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(
      { id: group?.id, terms },
      {
        onSuccess: () => {
          toast.success(group ? 'Group saved' : 'Group added');
          onDone();
        },
      },
    );
  };

  return (
    <DialogContent title={group ? 'Edit search words' : 'New search words'} description="Words that mean the same thing to shoppers.">
      <form onSubmit={submit} noValidate>
        <DialogBody>
          {generalError && <ErrorAlert message={generalError} />}
          <Field
            label="Words"
            htmlFor="synonym-terms"
            error={termsError}
            hint="Type a word and press Enter. Short phrases are fine: “exercise book”. Put the shop’s own word first, then Banglish, Bangla and misspellings."
            required
          >
            <TagsInput id="synonym-terms" value={terms} onChange={setTerms} placeholder="notebook, khata, exercise book" invalid={!!termsError} />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending} disabled={terms.length < 2}>
            {group ? 'Save' : 'Add group'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
