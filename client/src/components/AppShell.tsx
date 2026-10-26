import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';

type Props = PropsWithChildren<{ eyebrow?: string; title: string; subtitle?: string; compact?: boolean }>;

export function AppShell({ eyebrow = 'QTrack Lite', title, subtitle, compact, children }: Props) {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className={`mx-auto ${compact ? 'max-w-xl' : 'max-w-5xl'}`}>
        <header className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-moss">{eyebrow}</p>
            <h1 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{subtitle}</p>}
          </div>
          <Link
            to="/"
            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-ink shadow-sm transition hover:border-moss"
          >
            QTrack
          </Link>
        </header>
        {children}
      </div>
    </main>
  );
}
