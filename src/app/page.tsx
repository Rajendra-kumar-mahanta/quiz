'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Cpu,
  Radio,
  Trophy,
  Shield,
  Zap,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  Code2,
  Flame,
  Award,
  ChevronRight
} from 'lucide-react';
import { CyberButton } from '@/components/ui/CyberButton';
import { SoundToggle } from '@/components/ui/SoundToggle';

export default function HomePage() {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState('');
  
  // Interactive Simulator on Landing Page
  const [simSelected, setSimSelected] = useState<number | null>(null);
  const [simSubmitted, setSimSubmitted] = useState(false);

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionCode.trim()) {
      router.push(`/join/${sessionCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-mesh-dark cyber-grid relative selection:bg-cyber-cyan selection:text-surface-dark overflow-hidden">
      {/* Floating Aurora Glow Orbs */}
      <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-cyber-cyan/15 rounded-full blur-[140px] pointer-events-none animate-pulse-slow" />
      <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-cyber-violet/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-pink-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Navbar */}
      <header className="px-6 lg:px-16 py-5 flex items-center justify-between border-b border-cyber-cyan/20 bg-surface-dark/70 backdrop-blur-2xl sticky top-0 z-40">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyber-cyan via-blue-500 to-cyber-violet flex items-center justify-center shadow-[0_0_25px_rgba(0,217,255,0.6)] animate-float">
              <Cpu className="w-6 h-6 text-surface-dark stroke-[2.5]" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-green opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyber-green" />
            </span>
          </div>
          <div>
            <span className="font-extrabold text-2xl text-white tracking-wider flex items-center gap-1.5 font-heading">
              ROBO<span className="text-gradient-sexy font-black">QUEST</span>
            </span>
            <span className="text-[10px] text-cyber-cyan/80 font-mono tracking-widest block uppercase font-bold">
              Live Competition Engine
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SoundToggle />
          <Link href="/join">
            <CyberButton variant="outline" size="sm">
              Enter PIN
            </CyberButton>
          </Link>
          <Link href="/admin/login">
            <CyberButton variant="cyan" size="sm" icon={<Shield className="w-4 h-4" />}>
              Admin Portal
            </CyberButton>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 lg:py-24 max-w-6xl mx-auto z-10">
        {/* Shimmer Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/40 text-cyber-cyan text-xs font-semibold uppercase tracking-widest mb-8 animate-shimmer shadow-[0_0_20px_rgba(0,217,255,0.25)]">
          <Sparkles className="w-4 h-4 text-cyber-cyan animate-spin" style={{ animationDuration: '6s' }} />
          <span>Next-Gen Technical Competition Platform</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan" />
          <span className="text-white font-bold">B.Tech Robotics & Arduino</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight font-heading leading-[1.1] mb-6">
          The Ultimate Live <br />
          <span className="text-gradient-sexy drop-shadow-[0_0_40px_rgba(0,217,255,0.45)]">
            Robotics & Arena Quiz
          </span>
        </h1>

        <p className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto mb-12 leading-relaxed font-normal">
          Electrify your classroom and auditorium with millisecond-synchronized server timers, rapid speed bonuses, dynamic question banks, and projection-ready 3D podiums.
        </p>

        {/* Quick Join Widget with Sexy Holographic Border */}
        <div className="w-full max-w-lg p-8 rounded-3xl glass-panel-glow mb-16 relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyber-cyan via-cyber-violet to-pink-500 rounded-3xl blur opacity-30 group-hover:opacity-70 transition duration-500 -z-10" />
          
          <form onSubmit={handleQuickJoin} className="space-y-4">
            <div className="text-left">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-cyber-cyan flex items-center gap-1.5 font-mono">
                  <Flame className="w-4 h-4 text-cyber-amber" />
                  Join Live Arena
                </label>
                <span className="text-[10px] text-gray-400 font-mono">Instant Entry</span>
              </div>
              <input
                type="text"
                maxLength={10}
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="ENTER 6-CHAR PIN"
                className="w-full px-6 py-4 rounded-2xl bg-[#030917] border-2 border-cyber-cyan/40 focus:border-cyber-cyan text-center text-2xl font-mono font-black tracking-widest text-white outline-none transition-all placeholder:text-gray-600 uppercase shadow-inner"
              />
            </div>
            <CyberButton
              type="submit"
              variant="cyan"
              size="lg"
              className="w-full text-base"
              icon={<ArrowRight className="w-5 h-5" />}
            >
              Enter Competition Arena
            </CyberButton>
          </form>
        </div>

        {/* Live Interactive Challenge Simulator Widget */}
        <div className="w-full max-w-2xl p-7 rounded-3xl glass-panel-sexy text-left space-y-4 mb-16 relative">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyber-green animate-ping" />
              <span className="text-xs font-mono font-bold text-cyber-cyan uppercase">
                INTERACTIVE ARENA PREVIEW
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-cyber-violet/20 border border-cyber-violet/40 text-cyber-violet text-[10px] font-bold font-mono">
              30S TIMER • +20 PTS
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white">
            What fundamental triad governs the autonomous robotic control cycle?
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { id: 1, text: 'Sense — Decide — Act', correct: true },
              { id: 2, text: 'Power — Compute — Terminate', correct: false },
              { id: 3, text: 'Receive — Broadcast — Listen', correct: false },
              { id: 4, text: 'Compile — Flash — Reset', correct: false },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setSimSelected(opt.id);
                  setSimSubmitted(true);
                }}
                className={`p-3.5 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-center justify-between ${
                  simSubmitted && opt.correct
                    ? 'border-cyber-green bg-cyber-green/20 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : simSelected === opt.id && !opt.correct
                    ? 'border-cyber-red bg-cyber-red/20 text-white'
                    : 'border-white/10 bg-surface-dark/80 text-gray-200 hover:border-cyber-cyan/50 hover:bg-surface-light'
                }`}
              >
                <span>{opt.text}</span>
                {simSubmitted && opt.correct && <CheckCircle2 className="w-4 h-4 text-cyber-green" />}
              </button>
            ))}
          </div>

          {simSubmitted && (
            <div className="p-3 rounded-xl bg-cyber-green/10 border border-cyber-green/30 text-xs text-cyber-green font-medium flex items-center justify-between animate-fade-in">
              <span>🎉 Correct! Speed Bonus: +8 pts awarded!</span>
              <span className="font-mono font-bold">Total: 18/20 PTS</span>
            </div>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-7 rounded-3xl glass-card-interactive group">
            <div className="w-12 h-12 rounded-2xl bg-cyber-cyan/15 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan mb-5 group-hover:shadow-[0_0_20px_rgba(0,217,255,0.5)] transition-all">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyber-cyan transition-colors">
              Server-Authoritative Clock
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Synchronized millisecond countdowns prevent device clock drift or local tampering with central socket broadcasting.
            </p>
          </div>

          <div className="p-7 rounded-3xl glass-card-interactive group">
            <div className="w-12 h-12 rounded-2xl bg-cyber-violet/15 border border-cyber-violet/40 flex items-center justify-center text-cyber-violet mb-5 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyber-violet transition-colors">
              Speed Bonus Algorithm
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Rewards lightning-fast correct submissions: <span className="font-mono text-cyber-cyan">floor(remaining_sec / 3)</span> up to 10 bonus points per question.
            </p>
          </div>

          <div className="p-7 rounded-3xl glass-card-interactive group">
            <div className="w-12 h-12 rounded-2xl bg-cyber-green/15 border border-cyber-green/40 flex items-center justify-center text-cyber-green mb-5 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyber-green transition-colors">
              3D Auditorium Podium
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Dynamic animated pedestals with golden lighting, victory fanfares, and real-time rank shifts designed for large projectors.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-6 text-center text-xs text-gray-500 bg-surface-dark/70 backdrop-blur-md z-10">
        <p>© 2026 ROBOQUEST • Designed for Technical Workshops, Engineering Hackathons, and Robotics Arenas.</p>
      </footer>
    </div>
  );
}
