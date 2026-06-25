import { Link } from 'react-router-dom';
import { Database, Zap, Shield, ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <nav className="border-b border-slate-700/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <Database className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">Connexa</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-slate-300 hover:text-white transition-colors">Login</Link>
            <Link to="/register" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-5xl font-bold leading-tight tracking-tight">
            AI-powered natural language{' '}
            <span className="text-accent-light">database queries</span>
          </h1>
          <p className="mt-6 text-lg text-slate-400">
            Connect your PostgreSQL database, ask questions in plain English, and get SQL plus results instantly.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link to="/register" className="btn-primary px-8 py-3 text-base">
              Get Started <ArrowRight className="ml-2 inline h-4 w-4" />
            </Link>
            <a href="#features" className="btn-secondary border-slate-600 bg-transparent text-white hover:bg-slate-800 px-8 py-3 text-base">
              Learn more
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="bg-navy-800 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold">Built for data teams</h2>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-navy-900 p-8">
              <Zap className="h-8 w-8 text-accent-light" />
              <h3 className="mt-4 text-xl font-semibold">Natural Language to SQL</h3>
              <p className="mt-3 text-slate-400">
                Type a question, get a precise SQL query powered by local AI. No SQL expertise required.
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-navy-900 p-8">
              <Database className="h-8 w-8 text-accent-light" />
              <h3 className="mt-4 text-xl font-semibold">Any PostgreSQL Database</h3>
              <p className="mt-3 text-slate-400">
                Connect any PostgreSQL database securely. Each organization&apos;s data stays completely isolated.
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-navy-900 p-8">
              <Shield className="h-8 w-8 text-accent-light" />
              <h3 className="mt-4 text-xl font-semibold">Read-Only by Design</h3>
              <p className="mt-3 text-slate-400">
                Only SELECT queries run. No accidental deletes, no data mutations. Safe by architecture.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-700/50 py-8 text-center text-sm text-slate-500">
        &copy; {new Date().getFullYear()} Connexa. All rights reserved.
      </footer>
    </div>
  );
}
