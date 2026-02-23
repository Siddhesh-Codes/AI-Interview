'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, Rocket, ArrowRight } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [adminEmail, setAdminEmail] = useState('admin@demo.com');
  const [adminPassword, setAdminPassword] = useState('admin123456');

  // Check if user is already logged in → skip setup
  useEffect(() => {
    if (status === 'loading') return;
    if (session?.user?.orgSlug) {
      router.replace(`/${session.user.orgSlug}`);
      return;
    }
    setChecking(false);
  }, [session, status, router]);

  const handleSetup = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Setup failed');

      setDone(true);
      // Direct to login page after setup
      setTimeout(() => {
        router.push('/admin/login');
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  if (checking || status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[128px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-lg"
      >
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Initial Setup</h1>
            <p className="text-zinc-400 mt-2 text-sm">
              Create your admin account to get started
            </p>
          </div>

          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-center">
                <CheckCircle className="w-16 h-16 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold text-white text-center">
                Setup Complete!
              </h2>
              <p className="text-sm text-zinc-400 text-center">
                Redirecting to login...
              </p>

              <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Email:</span>
                  <span className="text-white font-mono">{adminEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Password:</span>
                  <span className="text-white font-mono">{adminPassword}</span>
                </div>
              </div>

              <button
                onClick={() => router.push('/admin/login')}
                className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
              >
                Go to Login
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@demo.com"
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Admin Password
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter a password"
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  />
                  <p className="text-xs text-zinc-600 mt-1">Minimum 6 characters</p>
                </div>
              </div>

              <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-4">
                <h3 className="text-sm font-medium text-zinc-300 mb-3">
                  This will:
                </h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    Create an admin account in the database
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    Link admin to &quot;Demo Company&quot; organization
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    Redirect to login page to sign in
                  </li>
                </ul>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"
                >
                  {error}
                </motion.p>
              )}

              <button
                onClick={handleSetup}
                disabled={loading || !adminEmail || !adminPassword || adminPassword.length < 6}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    Create Admin &amp; Start
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
