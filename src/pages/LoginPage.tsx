import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShoppingCart, Store, UserCheck } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { usePOS } from '@/src/hooks/usePOS';

const HAS_LIVE_BACKEND = Boolean(import.meta.env.VITE_API_BASE_URL);

export function LoginPage() {
  const { login, loginAsRole, settings } = usePOS();
  const [email, setEmail] = useState(HAS_LIVE_BACKEND ? '' : 'arvind@annapurnamart.in');
  const [password, setPassword] = useState(HAS_LIVE_BACKEND ? '' : 'demo1234');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await login(email, password);
      if (!res.ok) {
        setError(res.error ?? 'Unable to sign in.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Brand Context Panel */}
      <div className="hidden lg:flex lg:w-[46%] flex-col justify-between bg-slate-900 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Store className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">RetailFlow POS</span>
        </div>

        <div className="max-w-md space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight text-balance">
            Fast GST billing, stock control, and daily cash reconciliation in one terminal.
          </h1>
          <p className="text-sm leading-relaxed text-slate-300">
            Designed for Indian supermarkets, neighborhood grocery stores, and multi-aisle general
            retailers. Scan barcodes, apply CGST and SGST slabs automatically, and track real-time
            stock across store floors and backrooms.
          </p>
          <div className="grid grid-cols-3 gap-6 border-t border-slate-800 pt-6">
            <div>
              <p className="text-lg font-semibold font-mono tabular-nums">F2 / F4</p>
              <p className="mt-1 text-xs text-slate-400">Keyboard billing speed</p>
            </div>
            <div>
              <p className="text-lg font-semibold font-mono tabular-nums">0–18%</p>
              <p className="mt-1 text-xs text-slate-400">Auto CGST + SGST</p>
            </div>
            <div>
              <p className="text-lg font-semibold font-mono tabular-nums">50×25mm</p>
              <p className="mt-1 text-xs text-slate-400">Code 128 label studio</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          {settings.storeName} · {settings.city}, {settings.state} · Local Prototype Session
        </div>
      </div>

      {/* Right Sign-In Form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md rounded-xl border border-slate-200/90 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-2.5 lg:hidden mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Store className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              RetailFlow POS
            </span>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">Sign in to register</h2>
            <p className="mt-1 text-sm text-slate-500">
              Access {settings.storeName} billing terminal and store back-office.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-slate-700">
                Staff Email
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  spellCheck={false}
                  enterKeyHint="next"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                  placeholder="name@store.in"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-slate-700">
                Register Passcode / Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  enterKeyHint="done"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          {!HAS_LIVE_BACKEND && (
            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="text-xs font-medium text-slate-500 mb-3">Quick prototype entry</p>
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => loginAsRole('manager')}
                  className="w-full h-9"
                >
                  <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                  Store Manager
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => loginAsRole('cashier')}
                  className="w-full h-9"
                >
                  <ShoppingCart className="h-3.5 w-3.5 text-indigo-600" />
                  Cashier Terminal
                </Button>
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
                Frontend prototype using local browser state and sample data. No live database or real
                payment gateway is connected.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
