import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginSchema } from '@fixtrail/shared';
import { ApiError } from '../../api/client';
import { useLogin } from '../../api/hooks';
import { Button, Card, Field, Notice, SelectField, TextInput } from '../../components/ui';

type LoginRole = 'resident' | 'staff';

const ROLE_OPTIONS: { value: LoginRole; label: string }[] = [
  { value: 'resident', label: 'Resident' },
  { value: 'staff', label: 'Service worker' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<LoginRole>('resident');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Same rules the server applies, so typos are caught before a round trip.
    const parsed = loginSchema.safeParse({ name, email, role });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your details');
      return;
    }

    try {
      await login.mutateAsync(parsed.data);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log you in. Please try again.');
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Fixtrail</h1>
          <p className="text-sm text-muted">Every complaint gets an owner, a deadline and a way forward.</p>
        </header>

        <Notice tone="warn">
          Test build: you sign in with your email only, with no password. Anyone who knows an email can sign
          in as that person, so do not put real resident data in here.
        </Notice>

        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <Field label="Your name">
              <TextInput
                autoComplete="name"
                placeholder="e.g. Kiran"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <Field label="Email" hint="Your email is how we know your account.">
              <TextInput
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label="I am a">
              <SelectField<LoginRole>
                ariaLabel="Choose your role"
                value={role}
                onChange={setRole}
                options={ROLE_OPTIONS}
              />
            </Field>

            {error && (
              <p role="alert" className="text-sm text-warn">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? 'Logging in…' : 'Continue'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
