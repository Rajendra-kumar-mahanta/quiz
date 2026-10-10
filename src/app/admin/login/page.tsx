'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Cpu, Lock, Mail, ShieldCheck, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { CyberButton } from '@/components/ui/CyberButton';
import { SoundToggle } from '@/components/ui/SoundToggle';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 md:p-8 bg-background relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyber-cyan/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between max-w-md mx-auto w-full z-10">
        <Link href="/" className="flex items-center gap-2 text-xs text-gray-400 hover:text-cyber-cyan transition-all">
          <span>← Back to Public Portal</span>
        </Link>
        <SoundToggle />
      </div>

      <div className="w-full max-w-md mx-auto p-8 rounded-3xl bg-surface/90 border border-cyber-cyan/30 shadow-[0_0_50px_rgba(0,217,255,0.2)] backdrop-blur-xl z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyber-cyan to-cyber-violet flex items-center justify-center shadow-[0_0_20px_rgba(0,217,255,0.5)] mb-4">
            <ShieldCheck className="w-8 h-8 text-surface-dark" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono font-semibold mb-2">
            ADMINISTRATOR ACCESS
          </div>
          <h1 className="text-2xl font-extrabold text-white">ROBOQUEST Command Center</h1>
          <p className="text-xs text-gray-400 mt-1">Sign in with authorized administrator credentials.</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-cyber-red/10 border border-cyber-red text-cyber-red text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyber-cyan" />
              Administrator Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter administrator email"
              className="w-full px-4 py-3 rounded-xl bg-surface-dark border border-surface-border focus:border-cyber-cyan text-white text-sm outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyber-cyan" />
              Master Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter master password"
              className="w-full px-4 py-3 rounded-xl bg-surface-dark border border-surface-border focus:border-cyber-cyan text-white text-sm outline-none transition-all"
            />
          </div>

          <CyberButton
            type="submit"
            variant="cyan"
            size="lg"
            className="w-full mt-4"
            loading={loading}
            icon={<ArrowRight className="w-5 h-5" />}
          >
            Authenticate & Access Dashboard
          </CyberButton>
        </form>
      </div>

      <div className="text-center text-xs text-gray-500 z-10">
        ROBOQUEST • Secure Administrative Gateway
      </div>
    </div>
  );
}
