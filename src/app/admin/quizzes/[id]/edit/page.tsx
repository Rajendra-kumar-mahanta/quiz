'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Copy,
  Save,
  Play,
  Upload,
  Layers,
  HelpCircle,
  Eye,
  CheckCircle2,
  Code2
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CyberButton } from '@/components/ui/CyberButton';
import { QuestionEditorModal } from '@/components/admin/QuestionEditorModal';
import { BulkQuestionModal } from '@/components/admin/BulkQuestionModal';

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [defaultDuration, setDefaultDuration] = useState(30);
  const [baseMarks, setBaseMarks] = useState(10);
  const [maxBonus, setMaxBonus] = useState(10);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeMarks, setNegativeMarks] = useState(0);

  const fetchQuiz = () => {
    setLoading(true);
    fetch(`/api/quizzes/${quizId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.quiz) {
          setQuiz(data.quiz);
          setTitle(data.quiz.title);
          setDescription(data.quiz.description || '');
          setSubject(data.quiz.subject || 'Robotics');
          setDefaultDuration(data.quiz.defaultDuration);
          setBaseMarks(data.quiz.baseMarks);
          setMaxBonus(data.quiz.maxBonus);
          setNegativeMarking(data.quiz.negativeMarking);
          setNegativeMarks(data.quiz.negativeMarks);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (quizId) fetchQuiz();
  }, [quizId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          subject,
          defaultDuration: Number(defaultDuration),
          baseMarks: Number(baseMarks),
          maxBonus: Number(maxBonus),
          negativeMarking,
          negativeMarks: Number(negativeMarks)
        })
      });

      if (res.ok) {
        setMessage('Quiz settings updated successfully.');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuestion = async (questionData: any) => {
    if (editingQuestion?.id) {
      // Update existing question
      await fetch(`/api/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionData)
      });
    } else {
      // Create new question
      await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...questionData, quizId })
      });
    }
    fetchQuiz();
  };

  const handleBulkImport = async (questions: any[]) => {
    await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId, questions })
    });
    fetchQuiz();
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    await fetch(`/api/questions/${qId}`, { method: 'DELETE' });
    fetchQuiz();
  };

  const handleDuplicateQuestion = async (qId: string) => {
    await fetch(`/api/questions/${qId}`, { method: 'POST' });
    fetchQuiz();
  };

  if (loading) {
    return <div className="p-8 text-center text-cyber-cyan font-mono">Loading Quiz...</div>;
  }

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title={`Edit: ${quiz?.title || 'Quiz'}`}
        subtitle={`${quiz?.questions?.length || 0} Questions attached • Configure settings & question bank`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/quizzes">
              <CyberButton variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
                Quizzes
              </CyberButton>
            </Link>
          </div>
        }
      />

      <main className="p-8 space-y-8 flex-1 max-w-5xl mx-auto w-full">
        {message && (
          <div className="p-3 rounded-xl bg-cyber-green/10 border border-cyber-green text-cyber-green text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{message}</span>
          </div>
        )}

        {/* Quiz Settings Form */}
        <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-border">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyber-cyan" />
              Quiz Properties & Timing
            </h2>
            <CyberButton type="submit" variant="cyan" size="sm" loading={saving} icon={<Save className="w-3.5 h-3.5" />}>
              Save Settings
            </CyberButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-dark border border-surface-border text-white text-xs outline-none focus:border-cyber-cyan"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-dark border border-surface-border text-white text-xs outline-none focus:border-cyber-cyan"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Default Duration (s)</label>
              <input
                type="number"
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-surface-dark border border-surface-border text-white text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Base Marks</label>
              <input
                type="number"
                value={baseMarks}
                onChange={(e) => setBaseMarks(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-surface-dark border border-surface-border text-white text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Speed Bonus</label>
              <input
                type="number"
                value={maxBonus}
                onChange={(e) => setMaxBonus(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-surface-dark border border-surface-border text-white text-xs outline-none"
              />
            </div>
          </div>
        </form>

        {/* Questions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cyber-cyan" />
                Attached Questions ({quiz?.questions?.length || 0})
              </h2>
              <p className="text-xs text-gray-400">Add, edit, or reorder questions for this quiz session.</p>
            </div>

            <div className="flex items-center gap-2">
              <CyberButton
                variant="outline"
                size="sm"
                onClick={() => setIsBulkOpen(true)}
                icon={<Upload className="w-3.5 h-3.5" />}
              >
                Bulk Import
              </CyberButton>
              <CyberButton
                variant="cyan"
                size="sm"
                onClick={() => {
                  setEditingQuestion(null);
                  setIsEditorOpen(true);
                }}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Question
              </CyberButton>
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-3">
            {quiz?.questions?.map((q: any, idx: number) => (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-cyber-cyan/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-6 h-6 rounded-md bg-surface-dark flex items-center justify-center font-mono font-bold text-cyber-cyan text-xs">
                      #{idx + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface text-[10px] text-gray-400 font-semibold uppercase">
                      {q.type}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface text-[10px] text-cyber-violet font-semibold">
                      {q.difficulty}
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
                      <Code2 className="w-3 h-3" /> Includes C++ Snippet
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

                {/* Question Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
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
                    onClick={() => handleDuplicateQuestion(q.id)}
                    className="p-2 rounded-xl bg-surface hover:bg-surface-light border border-surface-border text-gray-300 hover:text-cyber-violet transition-all"
                    title="Duplicate Question"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-2 rounded-xl bg-surface hover:bg-surface-light border border-surface-border text-gray-300 hover:text-cyber-red transition-all"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Question Editor Modal */}
      <QuestionEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingQuestion(null);
        }}
        onSave={handleSaveQuestion}
        quizId={quizId}
        initialData={editingQuestion}
      />

      {/* Bulk Importer Modal */}
      <BulkQuestionModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onImport={handleBulkImport}
        quizId={quizId}
      />
    </div>
  );
}
