'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Download,
  Building,
  Mail,
  Trophy,
  Radio,
  Clock,
  CheckCircle2,
  Filter,
  Layers
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CyberButton } from '@/components/ui/CyberButton';

export default function AdminParticipantsPage() {
  const [participants, setParticipants] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch available sessions for filtering
  useEffect(() => {
    fetch('/api/sessions')
      .then((res) => res.json())
      .then((data) => {
        if (data.sessions) setSessions(data.sessions);
      });
  }, []);

  const fetchParticipants = () => {
    setLoading(true);
    let url = `/api/participants?search=${encodeURIComponent(search)}`;
    if (selectedSessionId !== 'ALL') url += `&sessionId=${encodeURIComponent(selectedSessionId)}`;
    if (selectedDept !== 'ALL') url += `&department=${encodeURIComponent(selectedDept)}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.participants) setParticipants(data.participants);
        if (data.departments) setDepartments(data.departments);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchParticipants();
  }, [selectedSessionId, selectedDept, search]);

  const handleExportCSV = () => {
    const headers = ['Name', 'Roll Number', 'Department', 'Institution', 'Email', 'Session Code', 'Session Title', 'Total Score', 'Correct Answers', 'Joined At'];
    const rows = participants.map((p) => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.rollNumber || '').replace(/"/g, '""')}"`,
      `"${(p.department || '').replace(/"/g, '""')}"`,
      `"${(p.institution || '').replace(/"/g, '""')}"`,
      `"${(p.email || '').replace(/"/g, '""')}"`,
      p.session?.sessionCode || '',
      `"${(p.session?.title || '').replace(/"/g, '""')}"`,
      p.totalScore || 0,
      p.correctCount || 0,
      new Date(p.joinedAt).toISOString()
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csvContent);
    const sessionLabel = selectedSessionId !== 'ALL' ? `session_${selectedSessionId}` : 'all_sessions';
    a.download = `roboquest_participants_${sessionLabel}.csv`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Master Participant Directory"
        subtitle="Manage and view participants scoped strictly per live session or across the platform"
        actions={
          <CyberButton variant="outline" size="sm" onClick={handleExportCSV} icon={<Download className="w-4 h-4" />}>
            Export Filtered CSV
          </CyberButton>
        }
      />

      <main className="p-8 space-y-6 flex-1">
        {/* Filters & Search Bar */}
        <div className="p-4 rounded-2xl bg-surface-card border border-surface-border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Session Filter */}
            <div>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-surface-dark border border-surface-border text-xs text-white outline-none focus:border-cyber-cyan font-semibold"
              >
                <option value="ALL">All Live Sessions (Global)</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    PIN: {s.sessionCode} — {s.title} ({s._count?.participants || 0} participants)
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface-dark border border-surface-border text-xs text-white outline-none focus:border-cyber-cyan"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, roll, email..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-dark border border-surface-border text-xs text-white outline-none focus:border-cyber-cyan"
              />
            </div>
          </div>

          <span className="text-xs text-gray-400 font-mono">
            {participants.length} participants in selected view
          </span>
        </div>

        {/* Participants Table */}
        {loading ? (
          <div className="text-center py-12 text-cyber-cyan font-mono text-sm">
            Loading Participant Records...
          </div>
        ) : participants.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-surface-card border border-surface-border">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-200">No Participants Found in this Session</h3>
            <p className="text-xs text-gray-400 mt-1">Select a different session filter or invite participants via QR code.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-dark text-gray-400 uppercase tracking-wider border-b border-surface-border font-semibold">
                  <tr>
                    <th className="p-3.5">Participant</th>
                    <th className="p-3.5">Roll / ID</th>
                    <th className="p-3.5">Department & College</th>
                    <th className="p-3.5">Live Session</th>
                    <th className="p-3.5">Accuracy</th>
                    <th className="p-3.5 text-right">Score in Session</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {participants.map((p) => (
                    <tr key={p.id} className="hover:bg-surface/50 transition-colors">
                      <td className="p-3.5">
                        <span className="font-bold text-white block">{p.name}</span>
                        {p.email && <span className="text-[10px] text-gray-500">{p.email}</span>}
                      </td>
                      <td className="p-3.5 font-mono text-gray-300">
                        {p.rollNumber || '—'}
                      </td>
                      <td className="p-3.5 text-gray-300">
                        <span>{p.department || 'General'}</span>
                        {p.institution && (
                          <span className="text-[10px] text-gray-500 block">{p.institution}</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-surface-dark border border-surface-border text-cyber-cyan font-mono font-bold text-[10px]">
                          PIN: {p.session?.sessionCode || 'CODE'}
                        </span>
                        <span className="text-[10px] text-gray-400 block truncate max-w-[150px] mt-0.5">
                          {p.session?.title || 'Workshop'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-gray-300">
                        {p.correctCount || 0} Correct
                      </td>
                      <td className="p-3.5 text-right font-mono font-extrabold text-cyber-cyan text-sm">
                        {p.totalScore || 0} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
