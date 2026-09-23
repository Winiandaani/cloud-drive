import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" />

      <nav className="relative flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2">
          <div
            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            className="h-8 w-8 bg-indigo-600"
          />
          <span className="brand-title text-lg font-bold">Cloud Drive</span>
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Sign up free
          </Link>
        </div>
      </nav>

      <main className="relative mx-auto max-w-3xl px-6 pt-20 text-center sm:pt-28">
        <h1 className="brand-title text-4xl font-bold tracking-tight sm:text-5xl">
          Your files, everywhere you need them
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400">
          Cloud Drive is a simple, secure place to store, organize, and share your files —
          accessible from any device, anywhere.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="w-full rounded-lg bg-indigo-600 px-8 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 sm:w-auto"
          >
            Get started for free
          </Link>
          <Link
            href="/login"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-8 py-3 text-sm font-medium text-white hover:bg-white/10 sm:w-auto"
          >
            Log in
          </Link>
        </div>
      </main>

      <section className="relative mx-auto mt-24 grid max-w-4xl grid-cols-1 gap-6 px-6 pb-24 sm:grid-cols-3">
        {[
          { title: 'Upload & organize', desc: 'Store files in folders you control, accessible anytime.' },
          { title: 'Share securely', desc: 'Invite specific people, or share a link with optional password.' },
          { title: 'Find it fast', desc: 'Search across every file and folder instantly.' },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-400">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}