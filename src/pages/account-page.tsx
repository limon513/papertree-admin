import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSession } from '@/hooks/use-auth';
import { api, ApiError, errorMessage } from '@/lib/api';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/input';
import { Avatar, ErrorAlert } from '@/components/ui/misc';

export function AccountPage() {
  const { admin } = useSession();

  return (
    <div className="max-w-2xl">
      <PageHeader title="My account" description="Your details and password." />

      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <Avatar name={admin.name} className="size-12 text-base" />
            <div className="min-w-0">
              <div className="font-semibold text-zinc-900">{admin.name}</div>
              <div className="truncate text-sm text-zinc-500">{admin.email}</div>
            </div>
            <Badge variant={admin.role.isSuperAdmin ? 'amber' : 'green'} className="ml-auto">
              {admin.role.name}
            </Badge>
          </CardContent>
        </Card>

        <ChangePasswordCard />
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const change = useMutation({
    mutationFn: () =>
      api<void>('/v1/admin/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
    onSuccess: () => {
      toast.success('Password changed. You were signed out on other devices.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
  });

  const fields = change.error instanceof ApiError ? change.error.fields : {};
  const generalError = change.isError && Object.keys(fields).length === 0 ? errorMessage(change.error) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    change.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>After changing it, you stay signed in here and get signed out everywhere else.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {generalError && <ErrorAlert message={generalError} />}
          <Field label="Current password" htmlFor="current-password" error={fields.currentPassword}>
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              invalid={!!fields.currentPassword}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" htmlFor="new-password" error={fields.newPassword} hint="At least 8 characters">
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                invalid={!!fields.newPassword}
              />
            </Field>
            <Field
              label="Repeat new password"
              htmlFor="confirm-password"
              error={mismatch ? 'The two passwords are not the same' : undefined}
            >
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                invalid={mismatch}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={change.isPending}>
              Change password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
