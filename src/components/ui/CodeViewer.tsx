'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface CodeViewerProps {
  code: string;
  language?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ code, language = 'cpp' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split('\n');

  return (
    <div className="my-4 rounded-xl border border-surface-border bg-[#030A17] overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-surface-dark/90 border-b border-surface-border text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyber-cyan" />
          <span className="font-mono text-cyber-cyan font-semibold">{language.toUpperCase()} SNIPPET</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded bg-surface hover:bg-surface-light text-gray-300 hover:text-white transition-all text-xs"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-cyber-green" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-200 leading-relaxed">
        <code>
          {lines.map((line, idx) => (
            <div key={idx} className="table-row">
              <span className="table-cell pr-4 select-none text-right text-gray-600 text-xs">
                {idx + 1}
              </span>
              <span className="table-cell whitespace-pre">{line}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
};
