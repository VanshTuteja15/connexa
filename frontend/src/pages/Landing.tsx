import { Link } from 'react-router-dom';
import { MessageSquare, Table2, Building2, ArrowRight, Check } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <nav className="border-b border-slate-700/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <Table2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">CaseCore</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-slate-300 hover:text-white transition-colors">
              Login
            </Link>
            <Link to="/register" className="btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-5xl font-bold leading-tight tracking-tight">
            AI-powered case management for{' '}
            <span className="text-accent-light">any organization</span>
          </h1>
          <p className="mt-6 text-lg text-slate-400">
            Manage cases through an Excel-style table or natural language AI chat.
            Each organization gets a private, secure workspace with its own AI that only knows your data.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link to="/register" className="btn-primary px-8 py-3 text-base">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <a href="#features" className="btn-secondary border-slate-600 bg-transparent text-white hover:bg-slate-800 px-8 py-3 text-base">
              Watch Demo
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="bg-navy-800 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold">Everything you need</h2>
          <p className="mt-3 text-center text-slate-400">Powerful features for modern case management</p>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-navy-900 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
                <MessageSquare className="h-6 w-6 text-accent-light" />
              </div>
              <h3 className="mt-6 text-xl font-semibold">AI Chat</h3>
              <p className="mt-3 text-slate-400">
                Ask questions in plain English. Get instant answers, summaries, and insights from your case data using local AI.
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-navy-900 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
                <Table2 className="h-6 w-6 text-accent-light" />
              </div>
              <h3 className="mt-6 text-xl font-semibold">Excel View</h3>
              <p className="mt-3 text-slate-400">
                Familiar spreadsheet interface with sorting, filtering, inline editing, and one-click Excel export.
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-navy-900 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
                <Building2 className="h-6 w-6 text-accent-light" />
              </div>
              <h3 className="mt-6 text-xl font-semibold">Multi-tenant</h3>
              <p className="mt-3 text-slate-400">
                Complete data isolation per organization. Universities, law firms, HR teams — each gets their own private workspace.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold">Simple pricing</h2>
          <p className="mt-3 text-center text-slate-400">Choose the plan that fits your organization</p>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-navy-800 p-8">
              <h3 className="text-lg font-semibold text-slate-300">Starter</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold">$299</span>
                <span className="text-slate-400">/mo</span>
              </div>
              <ul className="mt-8 space-y-3">
                {['Up to 10 users', '1,000 cases', 'AI chat', 'Excel export'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="h-4 w-4 text-accent-light" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="btn-secondary mt-8 w-full border-slate-600 text-white hover:bg-slate-700">
                Start free trial
              </Link>
            </div>
            <div className="relative rounded-xl border-2 border-accent bg-navy-800 p-8">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-medium">
                Popular
              </div>
              <h3 className="text-lg font-semibold text-slate-300">Pro</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold">$599</span>
                <span className="text-slate-400">/mo</span>
              </div>
              <ul className="mt-8 space-y-3">
                {['Unlimited users', 'Unlimited cases', 'Advanced AI + RAG', 'Priority support', 'Custom fields'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="h-4 w-4 text-accent-light" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="btn-primary mt-8 w-full">
                Start free trial
              </Link>
            </div>
            <div className="rounded-xl border border-slate-700 bg-navy-800 p-8">
              <h3 className="text-lg font-semibold text-slate-300">Enterprise</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold">Custom</span>
              </div>
              <ul className="mt-8 space-y-3">
                {['White-label branding', 'SSO / SAML', 'Dedicated support', 'SLA guarantee', 'On-premise option'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="h-4 w-4 text-accent-light" />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="mailto:sales@casecore.io" className="btn-secondary mt-8 w-full border-slate-600 text-white hover:bg-slate-700">
                Contact sales
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-700/50 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} CaseCore. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
