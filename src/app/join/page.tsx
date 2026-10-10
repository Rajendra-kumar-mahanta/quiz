'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Cpu, ArrowLeft, ArrowRight, KeyRound, Flame, Sparkles } from 'lucide-react';
import { CyberButton } from '@/components/ui/CyberButton';
import { SoundToggle } from '@/components/ui/SoundToggle';

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      router.push(`/join/${code.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 md:p-8 bg-mesh-dark cyber-grid relative overflow-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyber-cyan/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="flex items-center justify-between max-w-md mx-auto w-full z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-cyber-cyan transition-all">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <SoundToggle />
      </div>

      <div className="w-full max-w-md mx-auto p-8 sm:p-10 rounded-3xl glass-panel-glow text-center z-10 relative group">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-cyber-cyan via-blue-500 to-cyber-violet flex items-center justify-center shadow-[0_0_30px_rgba(0,217,255,0.6)] mb-6 animate-float">
          <KeyRound className="w-8 h-8 text-surface-dark stroke-[2.5]" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono font-bold uppercase mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          ARENA ACCESS TERMINAL
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">
          Enter Competition Code
        </h1>
        <p className="text-xs text-gray-300 mb-8 font-light">
          Enter the 6-character session PIN projected on the main screen to enter the arena.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              autoFocus
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="E.G. A8K9X2"
              className="w-full px-5 py-4 rounded-2xl bg-[#030917] border-2 border-cyber-cyan/40 focus:border-cyber-cyan text-center text-3xl font-mono font-black tracking-widest text-white outline-none transition-all placeholder:text-gray-600 uppercase shadow-inner"
            />
          </div>

          <CyberButton
            type="submit"
            variant="cyan"
            size="lg"
            className="w-full text-base"
            icon={<ArrowRight className="w-5 h-5" />}
          >
            Authenticate & Proceed
          </CyberButton>
        </form>
      </div>

      <div className="text-center text-xs text-gray-500 font-mono z-10">
        ROBOQUEST • Ultra-Fast Real-Time Gateway
      </div>
    </div>
  );
}
