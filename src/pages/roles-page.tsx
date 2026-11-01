import { useState, type FormEvent } from 'react';
import { Crown, MoreHorizontal, Pencil, Plus, ShieldCheck, Trash2, UserRoundSearch, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/hooks/use-auth';
import { useDeleteRole, useRoles, useSaveRole, type RoleInput } from '@/hooks/use-staff';
import { ApiError, errorMessage } from '@/lib/api';
import type { AdminModule, ModuleKey, Role } from '@/lib/types';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Input, Textarea } from '@/components/ui/input';
import { ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';

type FormState = { mode: 'create' } | { mode: 'edit'; role: Role } | null;

export function RolesPage() {
  const { modules } = useSession();
  const roles = useRoles();
  const deleteRole = useDeleteRole();
  const [form, setForm] = useState<FormState>(null);
  const [toDelete, setToDelete] = useState<Role | null>(null);

  const label = (key: ModuleKey) => modules.find((m) => m.key === key)?.label ?? key;

  const confirmDelete = () =>
    toDelete &&
    deleteRole.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success(`Role "${toDelete.name}" deleted`);
        setToDelete(null);
      },
      onError: (err) => toast.error(errorMessage(err)),
    });

  return (
    <div>
      <PageHeader
        title="Roles"
        description="A role decides which sections of the admin panel a staff member can open."
        actions={
          <Button onClick={() => setForm({ mode: 'create' })}>
            <Plus /> New role
          </Button>
        }
      />

      {roles.isError ? (
        <Card>
          <LoadError message={errorMessage(roles.error)} onRetry={() => roles.refetch()} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.isPending
            ? Array.from({ length: 3 }, (_, i) => (
                <Card key={i} className="space-y-4 p-5">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3.5 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </Card>
              ))
            : roles.data.items.map((role) => (
                <Card key={role.id} className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={
                          role.isSuperAdmin
                            ? 'flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700'
                            : 'flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700'
                        }
                      >
                        {role.isSuperAdmin ? <Crown className="size-4.5" /> : <ShieldCheck className="size-4.5" />}
                      </span>
                      <div>
                        <h3 className="font-semibold text-zinc-900">{role.name}</h3>
                        <p className="flex items-center gap-1 text-xs text-zinc-500">
                          <Users className="size-3.5" />
                          {role.staffCount ?? 0} staff
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${role.name}`} className="-mr-2 -mt-1">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => setForm({ mode: 'edit', role })}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        {!role.isSuperAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              danger
                              disabled={(role.staffCount ?? 0) > 0}
                              onSelect={() => setToDelete(role)}
                            >
                              <Trash2 /> {(role.staffCount ?? 0) > 0 ? 'Delete (move staff first)' : 'Delete'}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {role.description && <p className="mt-3 text-sm text-zinc-600">{role.description}</p>}

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {role.isSuperAdmin ? (
                      <Badge variant="amber">Full access to everything</Badge>
                    ) : role.modules.length ? (
                      role.modules.map((key) => (
                        <Badge key={key} variant="green">
                          {label(key)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-zinc-400">No sections yet — only the dashboard</span>
                    )}
                  </div>

                  {role.canImpersonate && !role.isSuperAdmin && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
                      <UserRoundSearch className="size-3.5" /> Can log in as a customer
                    </p>
                  )}
                </Card>
              ))}
        </div>
      )}

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        {form && (
          <RoleFormDialog
            key={form.mode === 'edit' ? form.role.id : 'new'}
            role={form.mode === 'edit' ? form.role : null}
            modules={modules}
            onDone={() => setForm(null)}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        danger
        loading={deleteRole.isPending}
        onConfirm={confirmDelete}
        title={`Delete the "${toDelete?.name}" role?`}
        description="This cannot be undone."
        confirmLabel="Delete role"
      />
    </div>
  );
}

function RoleFormDialog({ role, modules, onDone }: { role: Role | null; modules: AdminModule[]; onDone: () => void }) {
  const isEdit = role !== null;
  const isSuper = role?.isSuperAdmin ?? false;
  const save = useSaveRole();

  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selected, setSelected] = useState<Set<ModuleKey>>(new Set(role?.modules ?? []));
  const [canImpersonate, setCanImpersonate] = useState(role?.canImpersonate ?? false);

  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const generalError = save.isError && Object.keys(fields).length === 0 ? errorMessage(save.error) : null;

  const allSelected = selected.size === modules.length;
  const toggle = (key: ModuleKey, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input: RoleInput = { name, description: description.trim() || null };
    if (!isSuper) {
      input.modules = modules.map((m) => m.key).filter((k) => selected.has(k));
      input.canImpersonate = canImpersonate;
    }
    save.mutate(
      { id: role?.id, input },
      {
        onSuccess: (saved) => {
          toast.success(isEdit ? 'Role saved' : `Role "${saved.name}" created`);
          onDone();
        },
      },
    );
  };

  return (
    <DialogContent
      size="lg"
      title={isEdit ? `Edit role: ${role.name}` : 'New role'}
      description={isSuper ? 'The Super Admin role always has full access. You can only rename it.' : undefined}
    >
      <form onSubmit={submit} noValidate>
        <DialogBody>
          {generalError && <ErrorAlert message={generalError} />}

          <Field label="Role name" htmlFor="role-name" error={fields.name} required>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              invalid={!!fields.name}
              placeholder="e.g. Order Staff"
              autoFocus
            />
          </Field>

          <Field label="Description" htmlFor="role-description" error={fields.description} hint="Optional. What is this role for?">
            <Textarea
              id="role-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              invalid={!!fields.description}
            />
          </Field>

          {!isSuper && (
            <>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-800">Sections this role can open</span>
                  <button
                    type="button"
                    className="cursor-pointer text-sm font-medium text-brand-700 hover:underline"
                    onClick={() => setSelected(allSelected ? new Set() : new Set(modules.map((m) => m.key)))}
                  >
                    {allSelected ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                {fields.modules && <p className="mb-2 text-sm text-red-600">{fields.modules}</p>}
                <div className="grid gap-2 sm:grid-cols-2">
                  {modules.map((m) => {
                    const id = `module-${m.key}`;
                    const checked = selected.has(m.key);
                    return (
                      <label
                        key={m.key}
                        htmlFor={id}
                        className={
                          'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ' +
                          (checked ? 'border-brand-300 bg-brand-50/60' : 'border-zinc-200 hover:bg-zinc-50')
                        }
                      >
                        <Checkbox id={id} checked={checked} onCheckedChange={(v) => toggle(m.key, v === true)} className="mt-0.5" />
                        <span>
                          <span className="block text-sm font-medium text-zinc-900">{m.label}</span>
                          <span className="block text-xs text-zinc-500">{m.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Everyone can see the dashboard. Staff and Roles are always Super Admin only.
                </p>
              </div>

              <label
                htmlFor="role-impersonate"
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 px-3 py-3 hover:bg-zinc-50"
              >
                <Checkbox
                  id="role-impersonate"
                  checked={canImpersonate}
                  onCheckedChange={(v) => setCanImpersonate(v === true)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-900">Can log in as a customer</span>
                  <span className="block text-xs text-zinc-500">
                    Lets customer care see the store exactly as a customer sees it, to help them. Every use is recorded.
                  </span>
                </span>
              </label>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {isEdit ? 'Save role' : 'Create role'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
