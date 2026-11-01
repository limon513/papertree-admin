import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Package, ShoppingCart, Users } from 'lucide-react';
import { useLogin, useMe } from '@/hooks/use-auth';
import { ApiError, errorMessage } from '@/lib/api';
import { Logo } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, PasswordInput } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/misc';

export function LoginPage() {
  const me = useMe();
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (me.data) return <Navigate to={from} replace />;

  const fields = login.error instanceof ApiError ? login.error.fields : {};
  const hasFieldErrors = Object.keys(fields).length > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => navigate(from, { replace: true }) });
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-brand-800 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-brand-600/40 blur-3xl" />
        <Logo light className="relative" />
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight text-white">Run the whole store from one place.</h2>
          <p className="mt-3 text-brand-100">
            Products, orders, customers and the website itself — managed by your team, with the right access for
            everyone.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-brand-100">
            {[
              { icon: Package, text: 'Add products one by one, in bulk, or from other websites' },
              { icon: ShoppingCart, text: 'Track every order from placed to delivered' },
              { icon: Users, text: 'Understand your customers and help them faster' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4 text-white" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-brand-200">© {new Date().getFullYear()} PaperTree Bangladesh</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Sign in</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Welcome back. Use your staff email and password.</p>

          <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
            {login.isError && !hasFieldErrors && <ErrorAlert message={errorMessage(login.error)} />}

            <Field label="Email" htmlFor="email" error={fields.email}>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                placeholder="you@papertree.com.bd"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                invalid={!!fields.email}
              />
            </Field>

            <Field label="Password" htmlFor="password" error={fields.password}>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                invalid={!!fields.password}
              />
            </Field>

            <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
              Sign in
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-zinc-400">Forgot your password? Ask a Super Admin to reset it.</p>
        </div>
      </div>
    </div>
  );
}
