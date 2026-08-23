'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const body = mode === 'login' ? { email, password } : { name, email, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      login(data.token, data.user);
      router.push('/');
    } catch {
      setError("Couldn't reach the backend. Is it running?");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && user) {
    return (
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-3">
            {user.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <h1 className="font-display text-lg font-bold text-foreground mb-1">{user.name}</h1>
          <p className="text-sm text-muted-foreground mb-5">{user.email}</p>
          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="flex items-center justify-center gap-1.5 w-full bg-muted text-foreground text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-80 transition-opacity"
          >
            <LogOut size={14} /> Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full">
        <h1 className="font-display text-xl font-bold text-foreground mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create an account'}
        </h1>
        <p className="text-sm text-muted-foreground mb-5">
          {mode === 'login' ? 'Log in to book and manage your tours.' : 'Sign up to start booking tours.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
          }}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-4"
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}
