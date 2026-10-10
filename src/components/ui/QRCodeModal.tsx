'use client';

import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { X, Download, Copy, Check, Maximize2, Minimize2, ExternalLink, Sparkles } from 'lucide-react';
import { CyberButton } from './CyberButton';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionCode: string;
  quizTitle: string;
  joinPin?: string | null;
  participantCount?: number;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  sessionCode,
  quizTitle,
  joinPin,
  participantCount = 0
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [svgString, setSvgString] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const joinUrl = `${origin}/join/${sessionCode}`;

  useEffect(() => {
    if (!isOpen || !sessionCode) return;

    // Generate high resolution PNG data URL
    QRCode.toDataURL(joinUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#050F24',
        light: '#00D9FF'
      }
    })
      .then(url => setDataUrl(url))
      .catch(err => console.error('QR code generation error:', err));

    // Generate SVG string
    QRCode.toString(joinUrl, {
      type: 'svg',
      margin: 2,
      color: {
        dark: '#050F24',
        light: '#00D9FF'
      }
    })
      .then(svg => setSvgString(svg))
      .catch(err => console.error('QR SVG error:', err));
  }, [isOpen, sessionCode, joinUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `roboquest_qr_${sessionCode}.png`;
    a.click();
  };

  const handleDownloadSVG = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roboquest_qr_${sessionCode}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        ref={modalRef}
        className={`relative w-full max-w-2xl bg-surface-dark border border-cyber-cyan/40 rounded-2xl shadow-[0_0_50px_rgba(0,217,255,0.25)] p-6 md:p-8 flex flex-col items-center text-center overflow-y-auto max-h-[90vh] ${
          isFullscreen ? 'max-w-none h-screen justify-center' : ''
        }`}
      >
        {/* Close & Fullscreen controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-surface border border-surface-border text-gray-300 hover:text-cyber-cyan transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Projection'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-surface border border-surface-border text-gray-300 hover:text-cyber-red transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Live Session Access</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1">
          {quizTitle}
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Scan the QR Code on your smartphone camera or navigate to the joining link.
        </p>

        {/* QR Code Presentation Box */}
        <div className="p-4 bg-white rounded-2xl shadow-[0_0_30px_rgba(0,217,255,0.4)] border-4 border-cyber-cyan inline-block mb-6 transition-transform hover:scale-105">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`QR Code for Session ${sessionCode}`}
              className="w-56 h-56 md:w-72 md:h-72 object-contain"
            />
          ) : (
            <div className="w-56 h-56 md:w-72 md:h-72 flex items-center justify-center text-gray-800">
              Generating QR Code...
            </div>
          )}
        </div>

        {/* Access Codes Highlight */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-6">
          <div className="p-3.5 rounded-xl bg-surface border border-cyber-cyan/30 flex flex-col items-center">
            <span className="text-xs uppercase text-gray-400 font-semibold tracking-wider">Session Code</span>
            <span className="text-2xl md:text-3xl font-mono font-extrabold text-cyber-cyan tracking-wider">
              {sessionCode}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface border border-cyber-violet/30 flex flex-col items-center">
            <span className="text-xs uppercase text-gray-400 font-semibold tracking-wider">Join PIN</span>
            <span className="text-2xl md:text-3xl font-mono font-extrabold text-cyber-violet">
              {joinPin || 'None'}
            </span>
          </div>
        </div>

        {/* Live Joining URL */}
        <div className="flex items-center w-full max-w-lg p-2 rounded-xl bg-surface-card border border-surface-border mb-6">
          <input
            type="text"
            readOnly
            value={joinUrl}
            className="flex-1 bg-transparent px-3 text-xs md:text-sm font-mono text-gray-300 outline-none"
          />
          <CyberButton size="sm" variant="cyan" onClick={handleCopy} icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
            {copied ? 'Copied' : 'Copy'}
          </CyberButton>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <CyberButton size="sm" variant="outline" onClick={handleDownloadPNG} icon={<Download className="w-4 h-4" />}>
            Download PNG
          </CyberButton>
          <CyberButton size="sm" variant="outline" onClick={handleDownloadSVG} icon={<Download className="w-4 h-4" />}>
            Download SVG
          </CyberButton>
          <a
            href={joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-cyber-cyan/40 bg-surface/40 text-cyber-cyan hover:bg-cyber-cyan/15 text-xs font-semibold uppercase tracking-wider transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            Open Join Page
          </a>
        </div>
      </div>
    </div>
  );
};
