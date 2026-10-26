import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { InlineAlert } from '../components/InlineAlert';
import { usePolling } from '../hooks/usePolling';
import type { OwnerEntry, OwnerQueue } from '../types';

function formatJoined(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function QueuePerson({ entry, onNoShow, busy }: { entry: OwnerEntry; onNoShow: () => void; busy: boolean }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-cream text-lg font-black text-ink">
        #{entry.tokenNumber}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-ink">{entry.name}</p>
        <p className="text-sm text-slate-500">{entry.phone} · joined {formatJoined(entry.createdAt)}</p>
      </div>
      <button className="text-button self-start sm:self-auto" type="button" onClick={onNoShow} disabled={busy}>
        No-show
      </button>
    </article>
  );
}

export function DashboardPage() {
  const [queue, setQueue] = useState<OwnerQueue | null>(null);
  const [password, setPassword] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const result = await api.getOwnerQueue();
      setQueue(result);
      setAuthenticated(true);
      setError('');
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        setAuthenticated(false);
        setQueue(null);
      } else {
        setError(requestError instanceof Error ? requestError.message : 'Could not load the queue.');
      }
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  usePolling(refresh, 5_000, authenticated && !busy);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.login(password);
      setPassword('');
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await api.logout();
      setAuthenticated(false);
      setQueue(null);
    } finally {
      setBusy(false);
    }
  }

  async function advance() {
    setBusy(true);
    setError('');
    try {
      setQueue(await api.advanceQueue(queue?.serving?.id ?? null));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not advance the queue.');
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function noShow(entry: OwnerEntry) {
    if (!window.confirm(`Mark token #${entry.tokenNumber} as a no-show?`)) return;
    setBusy(true);
    setError('');
    try {
      setQueue(await api.markNoShow(entry.id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update the entry.');
    } finally {
      setBusy(false);
    }
  }

  if (!authChecked) {
    return (
      <AppShell title="Opening dashboard…">
        <div className="card h-48 animate-pulse bg-white/70" />
      </AppShell>
    );
  }

  if (!authenticated) {
    return (
      <AppShell title="Owner dashboard" subtitle="Sign in with the password configured for this shop." compact>
        <section className="card">
          {error && <div className="mb-4"><InlineAlert message={error} /></div>}
          <form className="space-y-4" onSubmit={login}>
            <label className="field-label">
              Owner password
              <input
                className="text-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={queue?.shop.name ?? 'Owner dashboard'}
      eyebrow="Owner dashboard"
      subtitle={`Today's queue · ${queue?.serviceDate ?? ''}`}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link className="text-button" to={`/q/${queue?.shop.slug ?? 'habib-clinic'}`}>Open customer page ↗</Link>
          <button className="text-button" type="button" onClick={logout} disabled={busy}>Sign out</button>
        </div>
        {error && <InlineAlert message={error} />}

        <section className="rounded-[1.75rem] bg-ink p-6 text-white shadow-soft sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Now serving</p>
              {queue?.serving ? (
                <>
                  <p className="mt-2 text-5xl font-black">#{queue.serving.tokenNumber}</p>
                  <p className="mt-2 text-lg font-semibold">{queue.serving.name}</p>
                  <p className="text-sm text-white/60">{queue.serving.phone}</p>
                </>
              ) : (
                <p className="mt-3 text-xl font-bold text-white/70">Nobody is being served</p>
              )}
            </div>
            <button className="primary-button bg-sun text-ink hover:bg-amber-300 sm:w-auto" onClick={advance} disabled={busy || (!queue?.serving && !queue?.waiting.length)}>
              {busy ? 'Updating…' : queue?.serving ? 'Complete & call next' : 'Call next'}
            </button>
          </div>
          {queue?.serving && (
            <button className="mt-5 text-sm font-bold text-emerald-200 underline-offset-4 hover:underline" type="button" onClick={() => void noShow(queue.serving!)} disabled={busy}>
              Mark current as no-show
            </button>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black text-ink">Waiting list</h2>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-moss shadow-sm">{queue?.waiting.length ?? 0} waiting</span>
          </div>
          <div className="space-y-3">
            {queue?.waiting.map((entry) => (
              <QueuePerson key={entry.id} entry={entry} onNoShow={() => void noShow(entry)} busy={busy} />
            ))}
            {queue?.waiting.length === 0 && (
              <div className="card border-dashed text-center text-slate-500">The waiting list is empty.</div>
            )}
          </div>
        </section>

        <p className="text-center text-xs text-slate-500">
          Updates every five seconds · last checked {queue ? new Date(queue.updatedAt).toLocaleTimeString() : '—'}
        </p>
      </div>
    </AppShell>
  );
}
