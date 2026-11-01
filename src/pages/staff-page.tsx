import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Ban, CheckCircle2, MoreHorizontal, Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/hooks/use-auth';
import {
  useDeleteStaff,
  useRoles,
  useSaveStaff,
  useSetStaffStatus,
  useStaffList,
  type StaffInput,
} from '@/hooks/use-staff';
import { ApiError, errorMessage } from '@/lib/api';
import type { Role, Staff, StaffStatus } from '@/lib/types';
import { formatDateTime, timeAgo } from '@/lib/utils';
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
import { Input, PasswordInput, Select } from '@/components/ui/input';
import { Avatar, EmptyState, ErrorAlert, LoadError, Skeleton } from '@/components/ui/misc';

type FormState = { mode: 'create' } | { mode: 'edit'; staff: Staff } | null;
type ConfirmState = { action: 'disable' | 'delete'; staff: Staff } | null;

export function StaffPage() {
  const { admin } = useSession();
  const staffList = useStaffList();
  const roles = useRoles();
  const setStatus = useSetStaffStatus();
  const deleteStaff = useDeleteStaff();

  const [form, setForm] = useState<FormState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const enable = (staff: Staff) =>
    setStatus.mutate(
      { id: staff.id, status: 'active' },
      {
        onSuccess: () => toast.success(`${staff.name} can sign in again`),
        onError: (err) => toast.error(errorMessage(err)),
      },
    );

  const runConfirm = () => {
    if (!confirm) return;
    const { action, staff } = confirm;
    const done = { onSuccess: () => setConfirm(null), onError: (err: unknown) => toast.error(errorMessage(err)) };
    if (action === 'disable') {
      setStatus.mutate(
        { id: staff.id, status: 'disabled' },
        { ...done, onSuccess: () => (done.onSuccess(), toast.success(`${staff.name} has been disabled`)) },
      );
    } else {
      deleteStaff.mutate(staff.id, {
        ...done,
        onSuccess: () => (done.onSuccess(), toast.success(`${staff.name} has been deleted`)),
      });
    }
  };

  const items = staffList.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Staff"
        description="People who can sign in to this admin panel. Each person has one role."
        actions={
          <Button onClick={() => setForm({ mode: 'create' })}>
            <Plus /> Add staff
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {staffList.isError ? (
          <LoadError message={errorMessage(staffList.error)} onRetry={() => staffList.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/70 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="hidden px-5 py-3 md:table-cell">Last sign-in</th>
                  <th className="w-12 px-5 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {staffList.isPending
                  ? Array.from({ length: 3 }, (_, i) => (
                      <tr key={i}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="size-9 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-3.5 w-32" />
                              <Skeleton className="h-3 w-44" />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <Skeleton className="h-5 w-24" />
                        </td>
                        <td className="px-5 py-4">
                          <Skeleton className="h-5 w-16" />
                        </td>
                        <td className="hidden px-5 py-4 md:table-cell">
                          <Skeleton className="h-3.5 w-20" />
                        </td>
                        <td />
                      </tr>
                    ))
                  : items.map((staff) => {
                      const isSelf = staff.id === admin.id;
                      const disabled = staff.status === 'disabled';
                      return (
                        <tr key={staff.id} className={disabled ? 'bg-zinc-50/50' : 'hover:bg-zinc-50/60'}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar name={staff.name} className={disabled ? 'bg-zinc-100 text-zinc-500' : undefined} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={disabled ? 'font-medium text-zinc-500' : 'font-medium text-zinc-900'}>
                                    {staff.name}
                                  </span>
                                  {isSelf && <Badge variant="blue">You</Badge>}
                                </div>
                                <div className="truncate text-zinc-500">{staff.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant={staff.role.isSuperAdmin ? 'amber' : 'gray'}>{staff.role.name}</Badge>
                          </td>
                          <td className="px-5 py-3.5">
                            {disabled ? (
                              <Badge variant="red">
                                <Ban /> Disabled
                              </Badge>
                            ) : (
                              <Badge variant="green">
                                <CheckCircle2 /> Active
                              </Badge>
                            )}
                          </td>
                          <td className="hidden px-5 py-3.5 text-zinc-500 md:table-cell" title={formatDateTime(staff.lastLoginAt)}>
                            {timeAgo(staff.lastLoginAt)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label={`Actions for ${staff.name}`}>
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => setForm({ mode: 'edit', staff })}>
                                  <Pencil /> Edit
                                </DropdownMenuItem>
                                {!isSelf &&
                                  (disabled ? (
                                    <DropdownMenuItem onSelect={() => enable(staff)}>
                                      <CheckCircle2 /> Enable sign-in
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onSelect={() => setConfirm({ action: 'disable', staff })}>
                                      <Ban /> Disable sign-in
                                    </DropdownMenuItem>
                                  ))}
                                {!isSelf && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem danger onSelect={() => setConfirm({ action: 'delete', staff })}>
                                      <Trash2 /> Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
            {!staffList.isPending && items.length === 0 && (
              <EmptyState icon={<UserCog />} title="No staff yet" description="Add your team so they can sign in." />
            )}
          </div>
        )}
      </Card>

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        {form && (
          <StaffFormDialog
            key={form.mode === 'edit' ? form.staff.id : 'new'}
            staff={form.mode === 'edit' ? form.staff : null}
            isSelf={form.mode === 'edit' && form.staff.id === admin.id}
            roles={roles.data?.items ?? []}
            rolesLoading={roles.isPending}
            onDone={() => setForm(null)}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        danger
        loading={setStatus.isPending || deleteStaff.isPending}
        onConfirm={runConfirm}
        title={confirm?.action === 'delete' ? `Delete ${confirm.staff.name}?` : `Disable ${confirm?.staff.name}?`}
        confirmLabel={confirm?.action === 'delete' ? 'Delete' : 'Disable'}
        description={
          confirm?.action === 'delete'
            ? 'They will lose access right away. Their past actions stay in the activity history. This cannot be undone.'
            : 'They will be signed out right away and cannot sign in until you enable them again.'
        }
      />
    </div>
  );
}

function StaffFormDialog({
  staff,
  isSelf,
  roles,
  rolesLoading,
  onDone,
}: {
  staff: Staff | null;
  isSelf: boolean;
  roles: Role[];
  rolesLoading: boolean;
  onDone: () => void;
}) {
  const isEdit = staff !== null;
  const save = useSaveStaff();
  const [name, setName] = useState(staff?.name ?? '');
  const [email, setEmail] = useState(staff?.email ?? '');
  const [roleId, setRoleId] = useState(staff ? String(staff.role.id) : '');
  const [status, setStatus] = useState<StaffStatus>(staff?.status ?? 'active');
  const [password, setPassword] = useState('');

  const fields = save.error instanceof ApiError ? save.error.fields : {};
  const generalError = save.isError && Object.keys(fields).length === 0 ? errorMessage(save.error) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input: StaffInput = { name, email, roleId: Number(roleId), status };
    if (password) input.password = password;
    save.mutate(
      { id: staff?.id, input },
      {
        onSuccess: (saved) => {
          toast.success(isEdit ? 'Changes saved' : `${saved.name} has been added`);
          onDone();
        },
      },
    );
  };

  return (
    <DialogContent
      title={isEdit ? 'Edit staff member' : 'Add staff member'}
      description={isEdit ? undefined : 'They can sign in with this email and password right away.'}
    >
      <form onSubmit={submit} noValidate>
        <DialogBody>
          {generalError && <ErrorAlert message={generalError} />}

          <Field label="Full name" htmlFor="staff-name" error={fields.name} required>
            <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} invalid={!!fields.name} autoFocus />
          </Field>

          <Field label="Email" htmlFor="staff-email" error={fields.email} required>
            <Input
              id="staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              invalid={!!fields.email}
              placeholder="name@papertree.com.bd"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Role"
              htmlFor="staff-role"
              error={fields.roleId}
              required
              hint={isSelf ? "You can't change your own role" : undefined}
            >
              <Select
                id="staff-role"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                invalid={!!fields.roleId}
                disabled={isSelf || rolesLoading}
              >
                <option value="" disabled>
                  {rolesLoading ? 'Loading roles…' : 'Choose a role'}
                </option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Status"
              htmlFor="staff-status"
              error={fields.status}
              hint={isSelf ? "You can't disable yourself" : undefined}
            >
              <Select
                id="staff-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StaffStatus)}
                disabled={isSelf}
              >
                <option value="active">Active — can sign in</option>
                <option value="disabled">Disabled — cannot sign in</option>
              </Select>
            </Field>
          </div>

          {isSelf ? (
            <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600">
              To change your own password, go to{' '}
              <Link to="/account" className="font-medium text-brand-700 hover:underline" onClick={onDone}>
                My account
              </Link>
              .
            </p>
          ) : (
            <Field
              label={isEdit ? 'New password' : 'Password'}
              htmlFor="staff-password"
              error={fields.password}
              required={!isEdit}
              hint={
                isEdit
                  ? 'Leave empty to keep the current password. Setting a new one signs them out everywhere.'
                  : 'At least 8 characters. Share it with them privately.'
              }
            >
              <PasswordInput
                id="staff-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                invalid={!!fields.password}
              />
            </Field>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {isEdit ? 'Save changes' : 'Add staff member'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
