'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sounds } from '@/lib/audio';

export const SoundToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(sounds.enabled);
  }, []);

  const toggle = () => {
    const newVal = sounds.toggleSound();
    setEnabled(newVal);
    if (newVal) sounds.playClick();
  };

  return (
    <button
      onClick={toggle}
      title={enabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
      className={`p-2 rounded-xl bg-surface-dark/80 border border-cyber-cyan/30 text-cyber-cyan hover:border-cyber-cyan hover:shadow-[0_0_12px_rgba(0,217,255,0.4)] transition-all ${className}`}
    >
      {enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
    </button>
  );
};
