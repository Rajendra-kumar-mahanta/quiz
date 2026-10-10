'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Table,
  CheckCircle2,
  Sparkles,
  Layers,
  Radio,
  FileSpreadsheet
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CyberButton } from '@/components/ui/CyberButton';

export default function AdminReportsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sessions')
      .then((res) => res.json())
      .then((data) => {
        if (data.sessions) {
          setSessions(data.sessions);
          if (data.sessions.length > 0) {
            setSelectedSessionId(data.sessions[0].id);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Reports & Export Suite"
        subtitle="Export participant registrations, response audit logs, final leaderboards, and print certificates"
        actions={
          <CyberButton variant="cyan" size="sm" onClick={handlePrint} icon={<Printer className="w-4 h-4" />}>
            Print / Save as PDF
          </CyberButton>
        }
      />

      <main className="p-8 space-y-8 flex-1 max-w-5xl mx-auto w-full">
        {/* Session Selector */}
        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
              Select Competition Session
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-xs text-white outline-none focus:border-cyber-cyan w-full sm:w-96 font-semibold"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sessionCode} — {s.title} ({s.status})
                </option>
              ))}
            </select>
          </div>

          <div className="text-right text-xs text-gray-400 font-mono">
            {selectedSession?._count?.participants || 0} Participants Registered
          </div>
        </div>

        {/* Export Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Final Leaderboard CSV */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan mb-3">
                <Table className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Final Leaderboard & Score Sheet</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Download rankings, participant names, student IDs, departments, base scores, and speed bonus breakdown in CSV format.
              </p>
            </div>

            <a
              href={`/api/sessions/${selectedSessionId}/export?format=csv`}
              className="mt-6 block"
            >
              <CyberButton variant="cyan" size="sm" className="w-full" icon={<Download className="w-4 h-4" />}>
                Download Leaderboard CSV
              </CyberButton>
            </a>
          </div>

          {/* Card 2: Granular Response Audit Log */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-cyber-violet/10 border border-cyber-violet/30 flex items-center justify-center text-cyber-violet mb-3">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Full Response-Level Audit Log</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Detailed question-by-question responses, selected options, correct answer keys, exact server timestamps, and response times.
              </p>
            </div>

            <a
              href={`/api/sessions/${selectedSessionId}/export?format=responses_csv`}
              className="mt-6 block"
            >
              <CyberButton variant="violet" size="sm" className="w-full" icon={<Download className="w-4 h-4" />}>
                Download Granular Responses CSV
              </CyberButton>
            </a>
          </div>
        </div>

        {/* Printable Workshop Summary Report Section */}
        <div className="p-8 rounded-2xl bg-surface-dark border border-surface-border space-y-6 print:border-none print:p-0">
          <div className="flex items-center justify-between pb-4 border-b border-surface-border">
            <div>
              <span className="text-xs uppercase text-cyber-cyan font-bold font-mono tracking-widest block">
                OFFICIAL WORKSHOP SUMMARY REPORT
              </span>
              <h2 className="text-2xl font-extrabold text-white mt-1">
                {selectedSession?.title || 'Robotics & Arduino Workshop Challenge'}
              </h2>
            </div>
            <span className="text-xs font-mono text-gray-400">
              Session Code: {selectedSession?.sessionCode}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-surface border border-surface-border">
              <span className="text-[10px] uppercase text-gray-400 font-bold">Total Participants</span>
              <div className="text-2xl font-mono font-black text-white mt-1">
                {selectedSession?._count?.participants || 0}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-surface-border">
              <span className="text-[10px] uppercase text-gray-400 font-bold">Total Questions</span>
              <div className="text-2xl font-mono font-black text-white mt-1">
                {selectedSession?._count?.sessionQuestions || 20}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-surface-border">
              <span className="text-[10px] uppercase text-gray-400 font-bold">Status</span>
              <div className="text-xl font-mono font-black text-cyber-green mt-1">
                {selectedSession?.status || 'Active'}
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-400 leading-relaxed">
            This official report is generated automatically by ROBOQUEST Live Competition Platform. Scoring incorporates 10 Base Marks with a speed bonus calculated by <span className="font-mono text-cyber-cyan">floor(remaining_sec / 3)</span> up to 10 points. Server deadlines are authoritatively enforced.
          </div>
        </div>
      </main>
    </div>
  );
}
