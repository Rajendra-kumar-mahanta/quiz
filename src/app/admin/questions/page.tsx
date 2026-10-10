'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Copy,
  Eye,
  Code2,
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CyberButton } from '@/components/ui/CyberButton';
import { QuestionEditorModal } from '@/components/admin/QuestionEditorModal';
import { BulkQuestionModal } from '@/components/admin/BulkQuestionModal';
import { CodeViewer } from '@/components/ui/CodeViewer';

export default function AdminQuestionsBankPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<any>(null);

  const fetchQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes');
      const data = await res.json();
      if (data.quizzes) {
        setQuizzes(data.quizzes);
        if (!selectedQuizId && data.quizzes.length > 0) {
          setSelectedQuizId(data.quizzes[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let url = `/api/questions?search=${encodeURIComponent(search)}`;
      if (selectedQuizId) url += `&quizId=${selectedQuizId}`;
      if (selectedCategory !== 'ALL') url += `&category=${encodeURIComponent(selectedCategory)}`;
      if (selectedDifficulty !== 'ALL') url += `&difficulty=${selectedDifficulty}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.questions) setQuestions(data.questions);
      if (data.categories) setCategories(data.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [selectedQuizId, selectedCategory, selectedDifficulty, search]);

  const handleSaveQuestion = async (questionData: any) => {
    if (editingQuestion?.id) {
      await fetch(`/api/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionData)
      });
    } else {
      await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...questionData, quizId: selectedQuizId })
      });
    }
    fetchQuestions();
  };

  const handleBulkImport = async (importedQuestions: any[]) => {
    await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: selectedQuizId, questions: importedQuestions })
    });
    fetchQuestions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    fetchQuestions();
  };

  const handleDuplicate = async (id: string) => {
    await fetch(`/api/questions/${id}`, { method: 'POST' });
    fetchQuestions();
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(questions, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `roboquest_questions_export.json`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Question Bank Master"
        subtitle="Explore, search, filter, preview, and configure all competition questions"
        actions={
          <div className="flex items-center gap-2">
            <CyberButton variant="outline" size="sm" onClick={handleExportJSON} icon={<Download className="w-4 h-4" />}>
              Export JSON
            </CyberButton>
            <CyberButton variant="outline" size="sm" onClick={() => setIsBulkOpen(true)} icon={<Upload className="w-4 h-4" />}>
              Bulk Import
            </CyberButton>
            <CyberButton
              variant="cyan"
              size="sm"
              onClick={() => {
                setEditingQuestion(null);
                setIsEditorOpen(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Question
            </CyberButton>
          </div>
        }
      />

      <main className="p-8 space-y-6 flex-1">
        {/* Filters Bar */}
        <div className="p-4 rounded-2xl bg-surface-card border border-surface-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Quiz Select */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Quiz Set</label>
            <select
              value={selectedQuizId}
              onChange={(e) => setSelectedQuizId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-dark border border-surface-border text-xs text-white outline-none focus:border-cyber-cyan"
            >
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-dark border border-surface-border text-xs text-white outline-none focus:border-cyber-cyan"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-dark border border-surface-border text-xs text-white outline-none focus:border-cyber-cyan"
            >
              <option value="ALL">All Difficulties</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Search Bank</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search text or code..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-dark border border-surface-border text-xs text-white outline-none focus:border-cyber-cyan"
              />
            </div>
          </div>
        </div>

        {/* Questions Grid */}
        {loading ? (
          <div className="text-center py-12 text-cyber-cyan font-mono text-sm">
            Loading Questions...
          </div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-surface-card border border-surface-border">
            <HelpCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-200">No Questions Match Filters</h3>
            <p className="text-xs text-gray-400 mt-1">Try adjusting the filter criteria or add a new question.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-cyber-cyan/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-surface-dark flex items-center justify-center font-mono font-bold text-cyber-cyan text-xs">
                      #{idx + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface text-[10px] text-gray-400 font-semibold uppercase">
                      {q.type}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface text-[10px] text-cyber-violet font-semibold">
                      {q.difficulty}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface text-[10px] text-cyber-cyan font-semibold">
                      {q.category}
                    </span>
                    <span className="text-gray-400 text-[10px]">
                      {q.duration}s • {q.points} pts
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white leading-snug">
                    {q.text}
                  </h3>

                  {q.codeSnippet && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#030A17] text-[10px] text-cyber-cyan font-mono">
                      <Code2 className="w-3 h-3" /> Includes C++ Code Snippet
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    {q.options?.map((opt: any, optIdx: number) => (
                      <span
                        key={opt.id || optIdx}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] ${
                          opt.isCorrect
                            ? 'bg-cyber-green/15 border-cyber-green/50 text-cyber-green font-semibold'
                            : 'bg-surface-dark border-surface-border text-gray-400'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}: {opt.text}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => setPreviewQuestion(q)}
                    className="p-2 rounded-xl bg-surface hover:bg-surface-light border border-surface-border text-gray-300 hover:text-cyber-cyan transition-all"
                    title="Student Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingQuestion(q);
                      setIsEditorOpen(true);
                    }}
                    className="p-2 rounded-xl bg-surface hover:bg-surface-light border border-surface-border text-gray-300 hover:text-cyber-cyan transition-all"
                    title="Edit Question"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(q.id)}
                    className="p-2 rounded-xl bg-surface hover:bg-surface-light border border-surface-border text-gray-300 hover:text-cyber-violet transition-all"
                    title="Duplicate Question"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-2 rounded-xl bg-surface hover:bg-surface-light border border-surface-border text-gray-300 hover:text-cyber-red transition-all"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Editor Modal */}
      <QuestionEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingQuestion(null);
        }}
        onSave={handleSaveQuestion}
        quizId={selectedQuizId}
        initialData={editingQuestion}
      />

      {/* Bulk Import Modal */}
      <BulkQuestionModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onImport={handleBulkImport}
        quizId={selectedQuizId}
      />

      {/* Standalone Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-surface-dark border border-cyber-cyan/40 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2 text-xs font-mono text-cyber-cyan">
                <Eye className="w-4 h-4" />
                <span>STUDENT VIEW PREVIEW</span>
              </div>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <h3 className="text-xl font-bold text-white leading-relaxed">
              {previewQuestion.text}
            </h3>

            {previewQuestion.codeSnippet && <CodeViewer code={previewQuestion.codeSnippet} />}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {previewQuestion.options?.map((opt: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex items-center gap-3 ${
                    opt.isCorrect
                      ? 'border-cyber-green bg-cyber-green/15 text-white'
                      : 'border-surface-border bg-surface-card text-gray-300'
                  }`}
                >
                  <span className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center font-bold text-xs text-cyber-cyan">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm font-medium flex-1">{opt.text}</span>
                  {opt.isCorrect && (
                    <span className="text-[10px] font-bold text-cyber-green uppercase">Correct</span>
                  )}
                </div>
              ))}
            </div>

            {previewQuestion.explanation && (
              <div className="p-4 rounded-xl bg-cyber-amber/10 border border-cyber-amber/30 text-xs text-cyber-amber leading-relaxed">
                <strong className="block mb-1">Explanation Reveal:</strong>
                {previewQuestion.explanation}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
