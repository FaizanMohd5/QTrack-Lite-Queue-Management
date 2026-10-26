import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { AppShell } from '../components/AppShell';
import { InlineAlert } from '../components/InlineAlert';
import { StatusPill } from '../components/StatusPill';
import { usePolling } from '../hooks/usePolling';
import type { PublicEntry, PublicQueue } from '../types';
import { peopleAheadMessage } from '../utils/queue';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function CustomerQueuePage() {
  const { shopSlug = '' } = useParams();
  const storageKey = `qtrack:${shopSlug}:entry-token`;
  const [queue, setQueue] = useState<PublicQueue | null>(null);
  const [entry, setEntry] = useState<PublicEntry | null>(null);
  const [entryToken, setEntryToken] = useState(() => localStorage.getItem(storageKey));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [queueResult, entryResult] = await Promise.all([
        api.getPublicQueue(shopSlug),
        entryToken ? api.getEntry(shopSlug, entryToken) : Promise.resolve(null),
      ]);
      setQueue(queueResult);
      if (entryResult) setEntry(entryResult.entry);
      setError('');
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 404 && entryToken) {
        localStorage.removeItem(storageKey);
        setEntryToken(null);
        setEntry(null);
      } else {
        setError(errorMessage(requestError));
      }
    } finally {
      setLoading(false);
    }
  }, [entryToken, shopSlug, storageKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  usePolling(refresh, 5_000);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await api.joinQueue(shopSlug, { name, phone });
      localStorage.setItem(storageKey, result.entryToken);
      setEntryToken(result.entryToken);
      setEntry(result.entry);
      setName('');
      setPhone('');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  function clearFinishedEntry() {
    localStorage.removeItem(storageKey);
    setEntryToken(null);
    setEntry(null);
  }

  if (loading && !queue) {
    return (
      <AppShell title="Loading queue…" compact>
        <div className="card h-40 animate-pulse bg-white/70" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title={queue?.shop.name ?? 'Queue unavailable'}
      subtitle="Your position refreshes automatically every five seconds. You can safely keep this page open or return to it later on this device."
      compact
    >
      <div className="space-y-5">
        {error && <InlineAlert message={error} />}

        <section className="grid grid-cols-2 gap-3" aria-label="Queue summary">
          <div className="metric-card">
            <span className="metric-label">Now serving</span>
            <strong className="metric-value">{queue?.nowServing ? `#${queue.nowServing}` : '—'}</strong>
          </div>
          <div className="metric-card">
            <span className="metric-label">Waiting</span>
            <strong className="metric-value">{queue?.waitingCount ?? '—'}</strong>
          </div>
        </section>

        {entry ? (
          <section className="card overflow-hidden" aria-live="polite">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <p className="text-sm font-semibold text-slate-500">Your token</p>
                <p className="mt-1 text-6xl font-black tracking-tight text-ink">#{entry.tokenNumber}</p>
              </div>
              <StatusPill status={entry.status} />
            </div>
            <div className="pt-5">
              {entry.status === 'WAITING' && (
                <p className="text-lg font-bold text-ink">{peopleAheadMessage(entry.peopleAhead)}</p>
              )}
              {entry.status === 'SERVING' && (
                <p className="text-lg font-bold text-moss">It’s your turn. Please proceed to the counter.</p>
              )}
              {entry.status === 'DONE' && <p className="text-lg font-bold text-ink">Your visit is complete. Thank you.</p>}
              {entry.status === 'NO_SHOW' && (
                <p className="text-lg font-bold text-ink">This token was marked as a no-show.</p>
              )}
              {(entry.status === 'DONE' || entry.status === 'NO_SHOW') && (
                <button className="mt-5 text-button" type="button" onClick={clearFinishedEntry}>
                  Join a new queue
                </button>
              )}
            </div>
          </section>
        ) : (
          <section className="card">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-ink">Join the queue</h2>
                <p className="mt-1 text-sm text-slate-500">No account or app is required.</p>
              </div>
              <span className={`status-pill ${queue?.isOpen ? 'status-serving' : 'status-no_show'}`}>
                {queue?.isOpen ? 'Open' : 'Closed'}
              </span>
            </div>
            <form className="space-y-4" onSubmit={submit}>
              <label className="field-label">
                Your name
                <input
                  className="text-input"
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
              <label className="field-label">
                Phone number
                <input
                  className="text-input"
                  type="tel"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  minLength={10}
                  maxLength={30}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </label>
              <button className="primary-button" type="submit" disabled={submitting || !queue?.isOpen}>
                {submitting ? 'Joining…' : queue?.isOpen ? 'Get my token' : 'Queue is closed'}
              </button>
            </form>
          </section>
        )}

        <p className="text-center text-xs text-slate-500">
          Last checked {queue ? new Date(queue.updatedAt).toLocaleTimeString() : '—'}
        </p>
      </div>
    </AppShell>
  );
}
