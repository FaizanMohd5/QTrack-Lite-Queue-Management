import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-ink text-white shadow-soft">
        <div className="grid gap-8 p-8 sm:p-12 md:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-sun">QTrack Lite</p>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl">Wait less. Know exactly when you’re next.</h1>
            <p className="mt-5 max-w-xl leading-7 text-emerald-50/80">
              A small, dependable queue for local clinics and service shops. Join from your phone and follow your place live.
            </p>
          </div>
          <div className="flex flex-col justify-end gap-3">
            <Link className="primary-button bg-sun text-ink hover:bg-amber-300" to="/q/habib-clinic">
              Join demo queue
            </Link>
            <Link className="secondary-button border-white/20 bg-white/10 text-white hover:bg-white/20" to="/dashboard">
              Owner dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
