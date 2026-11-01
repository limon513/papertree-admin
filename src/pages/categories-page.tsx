import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  EyeOff,
  FolderTree,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useCategories,
  useDeleteCategory,
  useReorderCategories,
  useSaveCategory,
  type CategoryInput,
} from '@/hooks/use-catalog';
import { ApiError, errorMessage } from '@/lib/api';
import { STORE_PATHS } from '@/lib/store';
import type { Category, Media } from '@/lib/types';
import { cn, slugify } from '@/lib/utils';
import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { PictureField } from '@/components/catalog/picture-field';
import { SeoFields } from '@/components/catalog/seo-fields';
import { SlugField, useSlug } from '@/components/catalog/slug-field';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { EmptyState, ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';
import { SwitchField } from '@/components/ui/switch';

const MAX_DEPTH = 3;

/** Tree helpers over the flat list from the API. */
function useTree(items: Category[]) {
  return useMemo(() => {
    const byId = new Map(items.map((c) => [c.id, c]));
    const childrenOf = new Map<number | null, Category[]>();
    for (const c of items) {
      const list = childrenOf.get(c.parentId) ?? [];
      list.push(c);
      childrenOf.set(c.parentId, list);
    }
    for (const list of childrenOf.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    }

    const children = (id: number | null) => childrenOf.get(id) ?? [];
    const ancestors = (c: Category) => {
      const list: Category[] = [];
      let parent = c.parentId === null ? undefined : byId.get(c.parentId);
      while (parent) {
        list.push(parent);
        parent = parent.parentId === null ? undefined : byId.get(parent.parentId);
      }
      return list;
    };
    const depth = (c: Category) => ancestors(c).length + 1;
    const height = (c: Category): number => 1 + Math.max(0, ...children(c.id).map(height));
    const descendants = (c: Category): Category[] => children(c.id).flatMap((k) => [k, ...descendants(k)]);

    /** Every category in tree order (parents before their children). */
    const ordered: Category[] = [];
    const walk = (parentId: number | null) => {
      for (const c of children(parentId)) {
        ordered.push(c);
        walk(c.id);
      }
    };
    walk(null);

    return { byId, children, ancestors, depth, height, descendants, ordered };
  }, [items]);
}

type Tree = ReturnType<typeof useTree>;
type FormState = { category: Category | null; parentId: number | null } | null;

export function CategoriesPage() {
  const categories = useCategories();
  const items = categories.data?.items ?? [];
  const tree = useTree(items);
  const reorder = useReorderCategories();
  const deleteCategory = useDeleteCategory();

  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<FormState>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  const query = search.trim().toLowerCase();
  const searching = query.length > 0;

  /** Rows to show: everything not inside a collapsed category, or search matches and their parents. */
  const rows = useMemo(() => {
    if (searching) {
      const keep = new Set<number>();
      for (const c of items) {
        if (c.name.toLowerCase().includes(query) || c.slug.includes(query)) {
          keep.add(c.id);
          for (const a of tree.ancestors(c)) keep.add(a.id);
        }
      }
      return tree.ordered.filter((c) => keep.has(c.id));
    }
    return tree.ordered.filter((c) => !tree.ancestors(c).some((a) => collapsed.has(a.id)));
  }, [searching, query, items, tree, collapsed]);

  const toggle = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const parents = items.filter((c) => tree.children(c.id).length > 0);
  const allCollapsed = parents.length > 0 && parents.every((c) => collapsed.has(c.id));

  const move = (c: Category, step: -1 | 1) => {
    const ids = tree.children(c.parentId).map((s) => s.id);
    const from = ids.indexOf(c.id);
    const to = from + step;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to]!, ids[from]!];
    reorder.mutate({ parentId: c.parentId, ids }, { onError: (err) => toast.error(errorMessage(err)) });
  };

  const confirmDelete = () =>
    toDelete &&
    deleteCategory.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success(`"${toDelete.name}" deleted`);
        setToDelete(null);
      },
      onError: (err) => toast.error(errorMessage(err)),
    });

  return (
    <div>
      <PageHeader
        title="Categories"
        description={`Group products so customers can find them. Up to ${MAX_DEPTH} levels, e.g. Paper › Art Paper › Watercolor.`}
        actions={
          <Button onClick={() => setForm({ category: null, parentId: null })}>
            <Plus /> New category
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {categories.isError ? (
          <LoadError message={errorMessage(categories.error)} onRetry={() => categories.refetch()} />
        ) : categories.isPending ? (
          <div className="divide-y divide-zinc-100">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5" style={{ paddingLeft: 16 + (i % 3) * 24 }}>
                <Skeleton className="size-5" />
                <Skeleton className="h-3.5 w-40" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<FolderTree />}
            title="No categories yet"
            description="Start with the main groups, like Paper, Pens or Art Supplies. Add sub-categories inside them."
            action={
              <Button onClick={() => setForm({ category: null, parentId: null })}>
                <Plus /> New category
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50/70 px-4 py-3 sm:flex-row sm:items-center">
              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search categories"
                  className="h-9 pl-9"
                  aria-label="Search categories"
                />
              </div>
              <div className="flex items-center justify-between gap-3 sm:ml-auto">
                <span className="text-sm text-zinc-500">
                  {searching ? `${rows.length} shown` : `${items.length} categor${items.length === 1 ? 'y' : 'ies'}`}
                </span>
                {!searching && parents.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(parents.map((c) => c.id)))}
                  >
                    {allCollapsed ? 'Expand all' : 'Collapse all'}
                  </Button>
                )}
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-zinc-500">No categories match "{search.trim()}".</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {rows.map((c) => (
                  <CategoryRow
                    key={c.id}
                    category={c}
                    tree={tree}
                    expanded={searching || !collapsed.has(c.id)}
                    searching={searching}
                    onToggle={() => toggle(c.id)}
                    onMove={(step) => move(c, step)}
                    onEdit={() => setForm({ category: c, parentId: c.parentId })}
                    onAddChild={() => setForm({ category: null, parentId: c.id })}
                    onDelete={() => setToDelete(c)}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </Card>

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        {form && (
          <CategoryFormDialog
            key={form.category?.id ?? `new-${form.parentId}`}
            category={form.category}
            initialParentId={form.parentId}
            tree={tree}
            onDone={() => setForm(null)}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        danger
        loading={deleteCategory.isPending}
        onConfirm={confirmDelete}
        title={`Delete "${toDelete?.name}"?`}
        description="This cannot be undone."
        confirmLabel="Delete category"
      />
    </div>
  );
}

function CategoryRow({
  category: c,
  tree,
  expanded,
  searching,
  onToggle,
  onMove,
  onEdit,
  onAddChild,
  onDelete,
}: {
  category: Category;
  tree: Tree;
  expanded: boolean;
  searching: boolean;
  onToggle: () => void;
  onMove: (step: -1 | 1) => void;
  onEdit: () => void;
  onAddChild: () => void;
  onDelete: () => void;
}) {
  const depth = tree.depth(c);
  const childCount = tree.children(c.id).length;
  const siblings = tree.children(c.parentId);
  const index = siblings.findIndex((s) => s.id === c.id);
  const hiddenParent = tree.ancestors(c).find((a) => !a.isActive);
  const canAddChild = depth < MAX_DEPTH;

  return (
    <li
      className={cn('group flex items-center gap-2 py-2 pr-3 hover:bg-zinc-50/70', !c.isActive && 'bg-zinc-50/40')}
      style={{ paddingLeft: 12 + (depth - 1) * 24 }}
    >
      {childCount > 0 ? (
        <button
          type="button"
          onClick={onToggle}
          disabled={searching}
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-default disabled:hover:bg-transparent"
          aria-label={expanded ? `Collapse ${c.name}` : `Expand ${c.name}`}
          aria-expanded={expanded}
        >
          <ChevronRight className={cn('size-4 transition-transform', expanded && 'rotate-90')} />
        </button>
      ) : (
        <span className="size-7 shrink-0" />
      )}

      <CatalogThumb image={c.image} icon={c.icon} name={c.name} muted={!c.isActive} className="size-8" />

      <button type="button" onClick={onEdit} className="min-w-0 cursor-pointer py-1 text-left">
        <span className={cn('block truncate text-sm font-medium', c.isActive ? 'text-zinc-900' : 'text-zinc-500')}>
          {c.name}
        </span>
        <span className="block truncate text-xs text-zinc-400">/{c.slug}</span>
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        {!c.isActive ? (
          <Badge>
            <EyeOff /> Hidden
          </Badge>
        ) : (
          hiddenParent && (
            <Badge title={`Hidden because "${hiddenParent.name}" is hidden`}>
              <EyeOff /> Parent hidden
            </Badge>
          )
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        {childCount > 0 && (
          <span className="mr-2 hidden text-xs text-zinc-400 md:inline">
            {childCount} sub-categor{childCount === 1 ? 'y' : 'ies'}
          </span>
        )}
        {!searching && siblings.length > 1 && (
          <span className="hidden sm:contents">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-zinc-400 hover:text-zinc-700"
              disabled={index === 0}
              onClick={() => onMove(-1)}
              aria-label={`Move ${c.name} up`}
              title="Move up"
            >
              <ArrowUp />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-zinc-400 hover:text-zinc-700"
              disabled={index === siblings.length - 1}
              onClick={() => onMove(1)}
              aria-label={`Move ${c.name} down`}
              title="Move down"
            >
              <ArrowDown />
            </Button>
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${c.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil /> Edit
            </DropdownMenuItem>
            {canAddChild && (
              <DropdownMenuItem onSelect={onAddChild}>
                <Plus /> Add sub-category
              </DropdownMenuItem>
            )}
            {!searching && siblings.length > 1 && (
              <span className="sm:hidden">
                <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(-1)}>
                  <ArrowUp /> Move up
                </DropdownMenuItem>
                <DropdownMenuItem disabled={index === siblings.length - 1} onSelect={() => onMove(1)}>
                  <ArrowDown /> Move down
                </DropdownMenuItem>
              </span>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem danger disabled={childCount > 0} onSelect={onDelete}>
              <Trash2 /> {childCount > 0 ? 'Delete (has sub-categories)' : 'Delete'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function CategoryFormDialog({
  category,
  initialParentId,
  tree,
  onDone,
}: {
  category: Category | null;
  initialParentId: number | null;
  tree: Tree;
  onDone: () => void;
}) {
  const isEdit = category !== null;
  const save = useSaveCategory();

  const [name, setName] = useState(category?.name ?? '');
  const { slug, setSlug, changed } = useSlug(name, category?.slug);
  const [parentId, setParentId] = useState(initialParentId === null ? '' : String(initialParentId));
  const [description, setDescription] = useState(category?.description ?? '');
  const [image, setImage] = useState<Media | null>(category?.image ?? null);
  const [icon, setIcon] = useState<string | null>(category?.icon ?? null);
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [seoTitle, setSeoTitle] = useState(category?.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(category?.seoDescription ?? '');

  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const generalError = save.isError && Object.keys(fields).length === 0 ? errorMessage(save.error) : null;

  // Where this category may go: not inside itself, and the whole branch must stay within MAX_DEPTH levels.
  const branchHeight = category ? tree.height(category) : 1;
  const blocked = new Set(category ? [category.id, ...tree.descendants(category).map((d) => d.id)] : []);
  const parentOptions = tree.ordered.map((c) => ({
    category: c,
    depth: tree.depth(c),
    disabled: blocked.has(c.id) || tree.depth(c) + branchHeight > MAX_DEPTH,
  }));

  const parentName = parentId ? tree.byId.get(Number(parentId))?.name : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input: CategoryInput = {
      name,
      slug: slugify(slug),
      parentId: parentId ? Number(parentId) : null,
      description: description.trim() || null,
      imageId: image?.id ?? null,
      icon,
      isActive,
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
    };
    save.mutate(
      { id: category?.id, input },
      {
        onSuccess: (saved) => {
          toast.success(isEdit ? 'Category saved' : `"${saved.name}" created`);
          onDone();
        },
      },
    );
  };

  const title = isEdit
    ? `Edit category: ${category.name}`
    : parentName
      ? `New sub-category in ${parentName}`
      : 'New category';

  return (
    <DialogContent size="lg" title={title}>
      <form onSubmit={submit} noValidate>
        <DialogBody>
          {generalError && <ErrorAlert message={generalError} />}

          <Field label="Name" htmlFor="category-name" error={fields.name} required>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              invalid={!!fields.name}
              placeholder="e.g. Art Paper"
              autoFocus
            />
          </Field>

          <SlugField
            id="category-slug"
            prefix={STORE_PATHS.category}
            value={slug}
            onChange={setSlug}
            changed={changed}
            error={fields.slug}
          />

          <Field
            label="Parent category"
            htmlFor="category-parent"
            error={fields.parentId}
            hint={isEdit && tree.children(category.id).length > 0 ? 'Its sub-categories move with it.' : undefined}
          >
            <Select
              id="category-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              invalid={!!fields.parentId}
            >
              <option value="">None (top level)</option>
              {parentOptions.map(({ category: c, depth, disabled }) => (
                <option key={c.id} value={c.id} disabled={disabled}>
                  {'    '.repeat(depth - 1)}
                  {depth > 1 ? '└ ' : ''}
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Description"
            htmlFor="category-description"
            error={fields.description}
            hint="Optional. Shown at the top of the category page."
          >
            <Textarea
              id="category-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              invalid={!!fields.description}
            />
          </Field>

          <PictureField
            imageLabel="Image"
            image={image}
            onImageChange={setImage}
            icon={icon}
            onIconChange={setIcon}
            error={fields.imageId ?? fields.icon}
          />

          <SwitchField
            id="category-active"
            label="Show on website"
            description="When off, customers cannot see this category or its sub-categories."
            checked={isActive}
            onCheckedChange={setIsActive}
          />

          <SeoFields
            idPrefix="category"
            path={STORE_PATHS.category + (slugify(slug) || slugify(name))}
            title={seoTitle}
            description={seoDescription}
            onTitleChange={setSeoTitle}
            onDescriptionChange={setSeoDescription}
            fallbackTitle={name}
            fallbackDescription={description}
            errors={fields}
          />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {isEdit ? 'Save category' : 'Create category'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
