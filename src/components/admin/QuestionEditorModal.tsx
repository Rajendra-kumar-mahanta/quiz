'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2, Eye, Edit3, Code2, Sparkles } from 'lucide-react';
import { CyberButton } from '../ui/CyberButton';
import { CodeViewer } from '../ui/CodeViewer';

interface Option {
  id?: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (questionData: any) => Promise<void>;
  quizId: string;
  initialData?: any;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  quizId,
  initialData
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [text, setText] = useState('');
  const [type, setType] = useState('MCQ_SINGLE');
  const [difficulty, setDifficulty] = useState('BEGINNER');
  const [category, setCategory] = useState('Robotics Fundamentals');
  const [points, setPoints] = useState(10);
  const [duration, setDuration] = useState(30);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [explanation, setExplanation] = useState('');
  const [options, setOptions] = useState<Option[]>([
    { text: '', isCorrect: true, order: 1 },
    { text: '', isCorrect: false, order: 2 },
    { text: '', isCorrect: false, order: 3 },
    { text: '', isCorrect: false, order: 4 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setText(initialData.text || '');
      setType(initialData.type || 'MCQ_SINGLE');
      setDifficulty(initialData.difficulty || 'BEGINNER');
      setCategory(initialData.category || 'Robotics Fundamentals');
      setPoints(initialData.points || 10);
      setDuration(initialData.duration || 30);
      setCodeSnippet(initialData.codeSnippet || '');
      setExplanation(initialData.explanation || '');
      if (initialData.options && initialData.options.length > 0) {
        setOptions(initialData.options.map((o: any, idx: number) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
          order: o.order || (idx + 1)
        })));
      }
    } else {
      // Reset defaults
      setText('');
      setType('MCQ_SINGLE');
      setDifficulty('BEGINNER');
      setCategory('Robotics Fundamentals');
      setPoints(10);
      setDuration(30);
      setCodeSnippet('');
      setExplanation('');
      setOptions([
        { text: '', isCorrect: true, order: 1 },
        { text: '', isCorrect: false, order: 2 },
        { text: '', isCorrect: false, order: 3 },
        { text: '', isCorrect: false, order: 4 },
      ]);
    }
    setActiveTab('edit');
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: string) => {
    setType(newType);
    if (newType === 'TRUE_FALSE') {
      setOptions([
        { text: 'True', isCorrect: true, order: 1 },
        { text: 'False', isCorrect: false, order: 2 }
      ]);
    } else if (options.length < 2) {
      setOptions([
        { text: '', isCorrect: true, order: 1 },
        { text: '', isCorrect: false, order: 2 },
        { text: '', isCorrect: false, order: 3 },
        { text: '', isCorrect: false, order: 4 }
      ]);
    }
  };

  const handleOptionTextChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index].text = val;
    setOptions(updated);
  };

  const handleCorrectToggle = (index: number) => {
    if (type === 'MCQ_MULTIPLE') {
      const updated = [...options];
      updated[index].isCorrect = !updated[index].isCorrect;
      setOptions(updated);
    } else {
      // Single choice / True False: only 1 can be correct
      const updated = options.map((opt, idx) => ({
        ...opt,
        isCorrect: idx === index
      }));
      setOptions(updated);
    }
  };

  const handleAddOption = () => {
    if (options.length >= 6) return;
    setOptions([...options, { text: '', isCorrect: false, order: options.length + 1 }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const updated = options.filter((_, idx) => idx !== index).map((opt, idx) => ({
      ...opt,
      order: idx + 1
    }));
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!text.trim()) {
      setError('Please provide the question prompt text.');
      return;
    }

    const filledOptions = options.filter(o => o.text.trim() !== '');
    if (filledOptions.length < 2) {
      setError('At least 2 non-empty answer options are required.');
      return;
    }

    const hasCorrect = filledOptions.some(o => o.isCorrect);
    if (!hasCorrect) {
      setError('Please select at least one correct answer option.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        quizId,
        text: text.trim(),
        type,
        difficulty,
        category: category.trim(),
        points: Number(points),
        duration: Number(duration),
        codeSnippet: codeSnippet.trim() || null,
        explanation: explanation.trim() || null,
        options: filledOptions
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-surface-dark border border-cyber-cyan/30 rounded-2xl shadow-2xl p-6 md:p-8 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-cyber-cyan" />
              {initialData ? 'Edit Question' : 'Create New Question'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Configure question parameters, code snippets, choices, and explanations.
            </p>
          </div>

          {/* Edit / Preview Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-surface p-1 border border-surface-border">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'edit'
                    ? 'bg-cyber-cyan text-surface-dark shadow-[0_0_10px_rgba(0,217,255,0.4)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'preview'
                    ? 'bg-cyber-cyan text-surface-dark shadow-[0_0_10px_rgba(0,217,255,0.4)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Student Preview
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-surface border border-surface-border text-gray-400 hover:text-cyber-red"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-cyber-red/10 border border-cyber-red text-cyber-red text-xs">
            {error}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {activeTab === 'edit' ? (
            <form id="question-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Question Text */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Question Prompt Text *
                </label>
                <textarea
                  rows={3}
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. Which of the following components is classified as an ACTUATOR in robotics?"
                  className="w-full px-4 py-3 rounded-xl bg-surface-card border border-surface-border focus:border-cyber-cyan text-white text-sm outline-none transition-all"
                />
              </div>

              {/* Type, Difficulty, Category, Points, Duration Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-white text-xs outline-none"
                  >
                    <option value="MCQ_SINGLE">Single MCQ</option>
                    <option value="MCQ_MULTIPLE">Multiple Select</option>
                    <option value="TRUE_FALSE">True / False</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-white text-xs outline-none"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Topic"
                    className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-white text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Points</label>
                  <input
                    type="number"
                    min="1"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-white text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Duration (s)</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-white text-xs outline-none"
                  />
                </div>
              </div>

              {/* Optional Code Snippet */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-cyber-cyan" />
                  Optional C++ / Arduino Code Snippet
                </label>
                <textarea
                  rows={3}
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  placeholder="void setup() { pinMode(13, OUTPUT); }"
                  className="w-full font-mono text-xs px-4 py-3 rounded-xl bg-[#030A17] border border-surface-border focus:border-cyber-cyan text-gray-200 outline-none transition-all"
                />
              </div>

              {/* Answer Options */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Answer Options (Mark Correct Answer) *
                  </label>
                  {type !== 'TRUE_FALSE' && options.length < 6 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-xs text-cyber-cyan hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Option
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {options.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        opt.isCorrect
                          ? 'bg-cyber-green/10 border-cyber-green/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                          : 'bg-surface-card border-surface-border'
                      }`}
                    >
                      {/* Correct Selector */}
                      <button
                        type="button"
                        onClick={() => handleCorrectToggle(idx)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                          opt.isCorrect
                            ? 'bg-cyber-green border-cyber-green text-surface-dark'
                            : 'border-gray-500 hover:border-cyber-cyan'
                        }`}
                        title="Mark as correct answer"
                      >
                        {opt.isCorrect && <CheckCircle2 className="w-4 h-4 fill-current" />}
                      </button>

                      <input
                        type="text"
                        required
                        value={opt.text}
                        disabled={type === 'TRUE_FALSE'}
                        onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 bg-transparent text-sm text-white outline-none px-2"
                      />

                      {type !== 'TRUE_FALSE' && options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="p-1.5 text-gray-500 hover:text-cyber-red transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyber-amber" />
                  Post-Question Educational Explanation
                </label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain why the answer is correct for students after the timer closes..."
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-card border border-surface-border focus:border-cyber-cyan text-white text-xs outline-none transition-all"
                />
              </div>
            </form>
          ) : (
            /* Student Preview Tab */
            <div className="p-6 rounded-2xl bg-[#030A17] border border-cyber-cyan/30 shadow-inner space-y-6">
              <div className="flex items-center justify-between text-xs text-cyber-cyan font-mono">
                <span>QUESTION PREVIEW</span>
                <span className="px-2.5 py-1 rounded bg-surface border border-cyber-cyan/30 font-bold">
                  {duration} SECONDS | {points} PTS
                </span>
              </div>

              <h3 className="text-lg md:text-xl font-extrabold text-white leading-snug">
                {text || 'Question text will appear here...'}
              </h3>

              {codeSnippet && <CodeViewer code={codeSnippet} />}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
                      opt.isCorrect
                        ? 'border-cyber-green/80 bg-cyber-green/10'
                        : 'border-surface-border bg-surface-card'
                    }`}
                  >
                    <span className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center font-bold text-xs text-cyber-cyan">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-sm font-medium text-gray-100 flex-1">
                      {opt.text || `Option ${idx + 1}`}
                    </span>
                    {opt.isCorrect && (
                      <span className="text-[10px] font-bold text-cyber-green uppercase tracking-wider">
                        CORRECT
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {explanation && (
                <div className="p-4 rounded-xl bg-cyber-amber/10 border border-cyber-amber/30 text-xs text-cyber-amber leading-relaxed">
                  <span className="font-bold block mb-1">Explanation Reveal:</span>
                  {explanation}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-surface-border flex items-center justify-end gap-3">
          <CyberButton variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </CyberButton>
          <CyberButton
            variant="cyan"
            size="sm"
            onClick={handleSubmit}
            loading={loading}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            {initialData ? 'Save Changes' : 'Create Question'}
          </CyberButton>
        </div>
      </div>
    </div>
  );
};
