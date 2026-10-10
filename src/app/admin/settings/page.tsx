'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Lock,
  User,
  ShieldCheck,
  Server,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CyberButton } from '@/components/ui/CyberButton';

export default function AdminSettingsPage() {
  const [data, setData] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchSettings = () => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        if (resData.admin?.name) setNewName(resData.admin.name);
      });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_PASSWORD',
          currentPassword,
          newPassword,
          newName
        })
      });

      const resData = await res.json();
      if (res.ok) {
        setMessage('Password and administrator profile updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        fetchSettings();
      } else {
        setError(resData.error || 'Failed to update password');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Platform & Security Settings"
        subtitle="Configure administrator credentials, inspect system health, and review audit logs"
      />

      <main className="p-8 space-y-8 flex-1 max-w-4xl mx-auto w-full">
        {message && (
          <div className="p-4 rounded-xl bg-cyber-green/10 border border-cyber-green text-cyber-green text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-cyber-red/10 border border-cyber-red text-cyber-red text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Security & Credentials Card */}
        <form onSubmit={handlePasswordUpdate} className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyber-cyan" />
            Administrator Credentials
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                Admin Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-xs text-white outline-none focus:border-cyber-cyan"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                Email Address (Read Only)
              </label>
              <input
                type="email"
                disabled
                value={data?.admin?.email || 'rajendrakumarmahanta22@gmail.com'}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-dark/50 border border-surface-border text-xs text-gray-400 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                Current Password *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-xs text-white outline-none focus:border-cyber-cyan"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                New Master Password *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-xs text-white outline-none focus:border-cyber-cyan"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <CyberButton type="submit" variant="cyan" size="sm" loading={loading} icon={<ShieldCheck className="w-4 h-4" />}>
              Update Password
            </CyberButton>
          </div>
        </form>

        {/* System Diagnostics */}
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-cyber-violet" />
            System Runtime & Database Diagnostics
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-surface-dark border border-surface-border">
              <span className="text-gray-400 block">Platform</span>
              <span className="font-mono text-white font-bold">{data?.systemInfo?.platform || 'ROBOQUEST v1.0.0'}</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-dark border border-surface-border">
              <span className="text-gray-400 block">Node Engine</span>
              <span className="font-mono text-white font-bold">{data?.systemInfo?.nodeVersion || 'v20+'}</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-dark border border-surface-border">
              <span className="text-gray-400 block">Database</span>
              <span className="font-mono text-cyber-green font-bold">{data?.systemInfo?.database || 'SQLite (Prisma)'}</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-dark border border-surface-border">
              <span className="text-gray-400 block">Real-time WebSockets</span>
              <span className="font-mono text-cyber-cyan font-bold">Active & Synchronized</span>
            </div>
          </div>
        </div>

        {/* Administrative Audit Log */}
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyber-green" />
            Recent Security & Audit Logs
          </h2>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {data?.auditLogs?.map((log: any) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-surface-dark border border-surface-border flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <span className="text-cyber-cyan font-bold">{log.action}</span>
                  <span className="text-gray-400 ml-2">{log.details}</span>
                </div>
                <span className="text-gray-500 text-[10px]">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
