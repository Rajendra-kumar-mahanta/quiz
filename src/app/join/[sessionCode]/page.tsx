'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Cpu,
  ArrowLeft,
  ArrowRight,
  User,
  Building,
  Mail,
  Hash,
  Lock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap
} from 'lucide-react';
import { CyberButton } from '@/components/ui/CyberButton';
import { SoundToggle } from '@/components/ui/SoundToggle';

export default function SessionJoinPage() {
  const params = useParams();
  const router = useRouter();
  const sessionCode = (params.sessionCode as string)?.toUpperCase();

  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [institution, setInstitution] = useState('');
  const [email, setEmail] = useState('');
  const [joinPin, setJoinPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionDetails, setSessionDetails] = useState<any>(null);

  useEffect(() => {
    if (!sessionCode) return;

    const storedToken = localStorage.getItem(`roboquest_token_${sessionCode}`);
    if (storedToken) {
      fetch('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionCode, existingToken: storedToken })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            router.push(`/play/${sessionCode}`);
          }
        })
        .catch(() => {});
    }

    fetch(`/api/sessions/${sessionCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.session) {
          setSessionDetails(data.session);
        } else {
          setError('Invalid session code or session not found.');
        }
      })
      .catch(() => setError('Failed to connect to server'));
  }, [sessionCode, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode,
          name: name.trim(),
          rollNumber: rollNumber.trim() || null,
          department: department.trim() || null,
          institution: institution.trim() || null,
          email: email.trim() || null,
          joinPin: joinPin.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join session');
      }

      localStorage.setItem(`roboquest_token_${sessionCode}`, data.sessionToken);
      localStorage.setItem(`roboquest_name_${sessionCode}`, data.participant.name);

      router.push(`/play/${sessionCode}`);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 md:p-8 bg-mesh-dark cyber-grid relative overflow-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-10 right-10 w-96 h-96 bg-cyber-violet/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="flex items-center justify-between max-w-lg mx-auto w-full z-10">
        <Link href="/join" className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-cyber-cyan transition-all">
          <ArrowLeft className="w-4 h-4" />
          <span>Change Session Code</span>
        </Link>
        <SoundToggle />
      </div>

      <div className="w-full max-w-lg mx-auto p-6 sm:p-10 rounded-3xl glass-panel-glow z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyber-cyan/15 border border-cyber-cyan/40 text-cyber-cyan text-xs font-mono font-black mb-3">
            SESSION PIN: {sessionCode}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {sessionDetails?.quiz?.title || 'Robotics & Arduino Workshop Challenge'}
          </h1>
          <p className="text-xs text-gray-300 mt-1.5 font-light">
            Enter your registration details to unlock your competition badge.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-2xl bg-cyber-red/10 border border-cyber-red text-cyber-red text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5 font-mono">
              <User className="w-3.5 h-3.5 text-cyber-cyan" />
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Kumar"
              className="w-full px-4 py-3 rounded-2xl bg-[#030917] border border-white/15 focus:border-cyber-cyan text-white text-sm outline-none transition-all shadow-inner"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5 font-mono">
                <Hash className="w-3.5 h-3.5 text-cyber-cyan" />
                Roll / Student ID
              </label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="21BCE1042"
                className="w-full px-4 py-2.5 rounded-xl bg-[#030917] border border-white/15 focus:border-cyber-cyan text-white text-sm outline-none shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5 font-mono">
                <Building className="w-3.5 h-3.5 text-cyber-cyan" />
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Robotics & Mechatronics"
                className="w-full px-4 py-2.5 rounded-xl bg-[#030917] border border-white/15 focus:border-cyber-cyan text-white text-sm outline-none shadow-inner"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5 font-mono">
                <Building className="w-3.5 h-3.5 text-cyber-cyan" />
                Institution
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="School of Engineering"
                className="w-full px-4 py-2.5 rounded-xl bg-[#030917] border border-white/15 focus:border-cyber-cyan text-white text-sm outline-none shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5 font-mono">
                <Mail className="w-3.5 h-3.5 text-cyber-cyan" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@college.edu"
                className="w-full px-4 py-2.5 rounded-xl bg-[#030917] border border-white/15 focus:border-cyber-cyan text-white text-sm outline-none shadow-inner"
              />
            </div>
          </div>

          {sessionDetails?.joinPin && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-cyber-violet mb-1.5 flex items-center gap-1.5 font-mono">
                <Lock className="w-3.5 h-3.5" />
                Session Access PIN *
              </label>
              <input
                type="password"
                required
                value={joinPin}
                onChange={(e) => setJoinPin(e.target.value)}
                placeholder="Enter Session PIN"
                className="w-full px-4 py-2.5 rounded-xl bg-[#030917] border border-cyber-violet/50 focus:border-cyber-violet text-white text-sm outline-none shadow-inner"
              />
            </div>
          )}

          <CyberButton
            type="submit"
            variant="cyan"
            size="lg"
            className="w-full mt-3 text-base"
            loading={loading}
            icon={<ArrowRight className="w-5 h-5" />}
          >
            Enter Competition Arena
          </CyberButton>
        </form>
      </div>

      <div className="text-center text-xs text-gray-500 font-mono z-10">
        ROBOQUEST • Secure Live Registration Terminal
      </div>
    </div>
  );
}
