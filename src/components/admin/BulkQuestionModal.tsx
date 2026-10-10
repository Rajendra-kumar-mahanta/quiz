'use client';

import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { CyberButton } from '../ui/CyberButton';

interface BulkQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: any[]) => Promise<void>;
  quizId: string;
}

const SAMPLE_JSON = `[
  {
    "text": "What is the primary function of pinMode(pin, OUTPUT) in Arduino?",
    "type": "MCQ_SINGLE",
    "difficulty": "BEGINNER",
    "category": "Digital I/O",
    "points": 10,
    "duration": 30,
    "explanation": "pinMode configures the designated GPIO pin to deliver 5V voltage.",
    "options": [
      { "text": "Configures pin to source electrical current", "isCorrect": true },
      { "text": "Measures analog temperature", "isCorrect": false },
      { "text": "Turns off the board power", "isCorrect": false },
      { "text": "Initializes serial communications", "isCorrect": false }
    ]
  }
]`;

export const BulkQuestionModal: React.FC<BulkQuestionModalProps> = ({
  isOpen,
  onClose,
  onImport,
  quizId
}) => {
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [inputData, setInputData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedCount, setParsedCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleParse = () => {
    setError('');
    setParsedCount(null);

    if (!inputData.trim()) {
      setError('Please paste JSON or CSV content.');
      return;
    }

    try {
      if (format === 'json') {
        const parsed = JSON.parse(inputData);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('Input must be a non-empty JSON array of question objects.');
        }
        setParsedCount(parsed.length);
        return parsed;
      } else {
        // Simple CSV parser
        const lines = inputData.trim().split('\n');
        if (lines.length < 2) throw new Error('CSV must contain at least a header and 1 row.');
        
        // Assume format: text,option1,option2,option3,option4,correctIndex(1-4),category,points,duration
        const questions = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length >= 6) {
            const correctIdx = parseInt(cols[5], 10) || 1;
            questions.push({
              text: cols[0],
              type: 'MCQ_SINGLE',
              difficulty: 'BEGINNER',
              category: cols[6] || 'General',
              points: parseInt(cols[7], 10) || 10,
              duration: parseInt(cols[8], 10) || 30,
              options: [
                { text: cols[1], isCorrect: correctIdx === 1, order: 1 },
                { text: cols[2], isCorrect: correctIdx === 2, order: 2 },
                { text: cols[3], isCorrect: correctIdx === 3, order: 3 },
                { text: cols[4], isCorrect: correctIdx === 4, order: 4 },
              ]
            });
          }
        }
        setParsedCount(questions.length);
        return questions;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse format.');
      return null;
    }
  };

  const handleImportSubmit = async () => {
    const questions = handleParse();
    if (!questions || questions.length === 0) return;

    setLoading(true);
    try {
      await onImport(questions);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-surface-dark border border-cyber-cyan/30 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyber-cyan/20 flex items-center justify-center text-cyber-cyan">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Bulk Question Importer</h2>
              <p className="text-xs text-gray-400">Import multiple questions in seconds via JSON or CSV.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-surface text-gray-400 hover:text-cyber-red">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-cyber-red/10 border border-cyber-red text-cyber-red text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="py-4 space-y-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex rounded-xl bg-surface p-1 border border-surface-border text-xs">
              <button
                type="button"
                onClick={() => { setFormat('json'); setInputData(SAMPLE_JSON); }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  format === 'json' ? 'bg-cyber-cyan text-surface-dark' : 'text-gray-400'
                }`}
              >
                JSON Array
              </button>
              <button
                type="button"
                onClick={() => { setFormat('csv'); setInputData('Text,Opt1,Opt2,Opt3,Opt4,CorrectIdx(1-4),Category,Points,Duration\n"Sample Q?","A","B","C","D",1,"Hardware",10,30'); }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  format === 'csv' ? 'bg-cyber-cyan text-surface-dark' : 'text-gray-400'
                }`}
              >
                CSV Format
              </button>
            </div>

            {parsedCount !== null && (
              <span className="text-xs text-cyber-green font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {parsedCount} questions ready
              </span>
            )}
          </div>

          <textarea
            rows={10}
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            placeholder={format === 'json' ? 'Paste JSON array here...' : 'Paste CSV text here...'}
            className="w-full font-mono text-xs px-4 py-3 rounded-xl bg-[#030A17] border border-surface-border focus:border-cyber-cyan text-gray-200 outline-none transition-all"
          />
        </div>

        <div className="pt-4 border-t border-surface-border flex items-center justify-end gap-3">
          <CyberButton variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </CyberButton>
          <CyberButton
            variant="cyan"
            size="sm"
            onClick={handleImportSubmit}
            loading={loading}
            icon={<Upload className="w-4 h-4" />}
          >
            Import Questions
          </CyberButton>
        </div>
      </div>
    </div>
  );
};
