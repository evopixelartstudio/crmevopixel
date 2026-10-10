'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';

export function LoginForm() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (new URLSearchParams(window.location.search).has('error')) setError('Não foi possível autorizar o acesso. Confirme sua permissão com o administrador.'); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível entrar. Tente novamente.');
      window.location.assign('/');
    } catch (e) { setError(e instanceof Error ? e.message : 'Verifique sua conexão e tente novamente.'); setBusy(false); }
  }
  const input = 'w-full min-h-11 rounded-xl border border-[var(--evo-border)] bg-[var(--evo-card)] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[#F1F9A1]';
  return <div className="space-y-6">
    <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
      <div className="space-y-2"><label htmlFor="email" className="text-sm">E-mail</label><input id="email" name="email" type="email" autoComplete="username" required maxLength={254} className={input} /></div>
      <div className="space-y-2"><label htmlFor="password" className="text-sm">Senha</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} className={input} /></div>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar com e-mail'}</Button>
    </form>
  </div>;
}
