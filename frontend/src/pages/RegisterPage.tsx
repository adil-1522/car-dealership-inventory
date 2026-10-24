import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const field = (name: keyof typeof form) => ({
    id: name,
    value: form[name],
    onChange: (e: { target: { value: string } }) => setForm((prev) => ({ ...prev, [name]: e.target.value })),
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Browse the lot and purchase vehicles in a click.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input required autoComplete="name" className="input" {...field('name')} />
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input type="email" required autoComplete="email" className="input" {...field('email')} />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input type="password" required minLength={6} autoComplete="new-password" className="input" {...field('password')} />
        </div>
        <div>
          <label htmlFor="confirm" className="label">Confirm password</label>
          <input type="password" required autoComplete="new-password" className="input" {...field('confirm')} />
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-accent-400 hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
