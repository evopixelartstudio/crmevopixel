'use client';
import { useState } from 'react';

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <div><button disabled={busy} className="min-h-11 px-3 text-sm text-[var(--evo-muted)] hover:text-[var(--evo-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F1F9A1]" onClick={async () => {
    setBusy(true); setError(false);
    try { const response = await fetch('/api/auth/logout', { method: 'POST' }); if (!response.ok) throw new Error(); window.location.assign('/login'); }
    catch { setError(true); setBusy(false); }
  }}>{busy ? 'Saindo…' : 'Sair'}</button>{error && <span role="alert" className="text-xs text-red-300">Tente sair novamente.</span>}</div>;
}
