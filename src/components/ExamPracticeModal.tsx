import React, { useState } from 'react';
import {
  X,
  GraduationCap,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Award,
  Lightbulb,
  BookOpen,
} from 'lucide-react';
import { NEBQuestion, CEEQuestion, SubjectCategory } from '../types';
import { MathMarkdown } from './MathMarkdown';

interface ExamPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSubject: SubjectCategory;
}

export const ExamPracticeModal: React.FC<ExamPracticeModalProps> = ({
  isOpen,
  onClose,
  selectedSubject,
}) => {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [examData, setExamData] = useState<{
    title: string;
    subject: string;
    topicSummary: string;
    nebQuestions: NEBQuestion[];
    ceeQuestions: CEEQuestion[];
  } | null>(null);

  const [revealedSolutions, setRevealedSolutions] = useState<Record<number, boolean>>({});
  const [ceeSelections, setCeeSelections] = useState<Record<string, number>>({});

  if (!isOpen) return null;

  const handleGenerateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isLoading) return;

    setIsLoading(true);
    setExamData(null);
    setRevealedSolutions({});
    setCeeSelections({});

    try {
      const res = await fetch('/api/exam-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), subject: selectedSubject }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate exam set');
      }

      const data = await res.json();
      setExamData(data);
    } catch (err) {
      console.error(err);
      alert('Error generating exam set. Please check network or try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSolution = (idx: number) => {
    setRevealedSolutions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCeeSelect = (ceeId: string, optionIdx: number) => {
    setCeeSelections((prev) => ({ ...prev, [ceeId]: optionIdx }));
  };

  // Calculate CEE Score
  const ceeCount = examData?.ceeQuestions?.length || 0;
  let correctCount = 0;
  if (examData?.ceeQuestions) {
    examData.ceeQuestions.forEach((q) => {
      const selected = ceeSelections[q.id];
      if (selected !== undefined && selected === q.correctIndex) {
        correctCount++;
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6"
      id="exam-modal-backdrop"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === 'exam-modal-backdrop') {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-4xl h-[90vh] bg-white dark:bg-[#111827] border border-[#e3e3e3] dark:border-[#1e293b] rounded-2xl shadow-xl flex flex-col overflow-hidden text-[#1f1f1f] dark:text-[#f1f5f9]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e3e3e3] dark:border-[#1e293b] bg-[#f8f9fa] dark:bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/80 rounded-xl text-blue-700 dark:text-blue-300">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1f1f1f] dark:text-white flex items-center gap-2">
                NEB Board & CEE Entrance Practice Generator
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Generate tailored subjective questions & entrance MCQs for any chapter
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-100 dark:bg-[#1e293b] hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Topic Input Form */}
        <div className="p-6 bg-[#f8f9fa] dark:bg-[#0f172a] border-b border-[#e3e3e3] dark:border-[#1e293b]">
          <form onSubmit={handleGenerateExam} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={`Enter any topic (e.g. Wave Optics, Thermodynamics, Chemical Equilibrium, Human Heart)`}
              className="flex-1 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-[#334155] rounded-xl px-4 py-2.5 text-sm text-[#1f1f1f] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 transition shadow-2xs"
            />
            <button
              type="submit"
              disabled={!topic.trim() || isLoading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-2xs shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Generating Test...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Exam
                </>
              )}
            </button>
          </form>
        </div>

        {/* Main Test View Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fdfdfd] dark:bg-[#0b0f19]">
          {!examData && !isLoading && (
            <div className="flex flex-col items-center justify-center text-center py-16 text-gray-500 dark:text-gray-400 space-y-3">
              <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-500 stroke-1" />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                Type any subject chapter or topic above
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
                Gemini will instantly compile authentic NEB 2/4/5 marks subjective questions with full step-by-step marking scheme solutions and CEE entrance MCQs with shortcut tricks!
              </p>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center text-center py-16 text-gray-500 dark:text-gray-400 space-y-3">
              <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Analyzing NEB Board Standards & CEE Entrance Pattern for "{topic}"...
              </p>
            </div>
          )}

          {examData && (
            <div className="space-y-8">
              {/* Header Info */}
              <div className="bg-[#e8f0fe] dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 p-4 rounded-xl flex items-center justify-between text-blue-900 dark:text-blue-100">
                <div>
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wider">
                    {examData.subject} Practice Set
                  </span>
                  <h3 className="text-lg font-bold text-[#1f1f1f] dark:text-white">{examData.title}</h3>
                  <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{examData.topicSummary}</p>
                </div>
                {ceeCount > 0 && (
                  <div className="bg-white dark:bg-[#1e293b] px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 text-center shadow-2xs">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold block">
                      CEE Score
                    </span>
                    <span className="text-base font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {correctCount} / {ceeCount}
                    </span>
                  </div>
                )}
              </div>

              {/* NEB Questions */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  NEB Board Exam Subjective Questions
                </h4>
                <div className="space-y-4">
                  {examData.nebQuestions.map((q, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-[#e3e3e3] dark:border-[#334155] space-y-3 shadow-2xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-medium text-[#1f1f1f] dark:text-[#f1f5f9] flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">Q{idx + 1}.</span>
                          <MathMarkdown content={q.question} />
                        </div>
                        <span className="px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 rounded border border-blue-200 dark:border-blue-800 shrink-0">
                          {q.marks}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleSolution(idx)}
                        className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium bg-[#f8f9fa] dark:bg-[#0f172a] px-3 py-1.5 rounded-lg border border-gray-300 dark:border-[#334155] transition"
                      >
                        {revealedSolutions[idx] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{revealedSolutions[idx] ? 'Hide Solution' : 'View Solution'}</span>
                      </button>

                      {revealedSolutions[idx] && (
                        <div className="p-3.5 bg-[#f8f9fa] dark:bg-[#0f172a] rounded-lg text-xs sm:text-sm text-[#1f1f1f] dark:text-[#f1f5f9] border border-[#e3e3e3] dark:border-[#334155] leading-relaxed">
                          <strong className="text-emerald-700 dark:text-emerald-400 block mb-1">Model Solution:</strong>
                          <MathMarkdown content={q.solution} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* CEE Questions */}
              <div className="space-y-4 bg-[#fcf8f0] dark:bg-[#1a1813] p-4 rounded-2xl border border-[#ede2cf] dark:border-[#3a3325]">
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  CEE Entrance Exam Multiple Choice MCQs
                </h4>
                <div className="space-y-4">
                  {examData.ceeQuestions.map((cq, idx) => {
                    const userSelected = ceeSelections[cq.id];
                    const isAnswered = userSelected !== undefined;

                    return (
                      <div key={cq.id} className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-[#ede2cf] dark:border-[#334155] space-y-3 shadow-2xs">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 font-bold font-mono text-sm">MCQ {idx + 1}.</span>
                          <div className="text-sm font-medium text-[#1f1f1f] dark:text-[#f1f5f9]">
                            <MathMarkdown content={cq.question} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {cq.options.map((opt, optIdx) => {
                            let btnStyle = 'bg-[#f8f9fa] dark:bg-[#0f172a] border-[#e3e3e3] dark:border-[#334155] text-[#1f1f1f] dark:text-[#f1f5f9] hover:bg-gray-100 dark:hover:bg-slate-800';
                            if (isAnswered) {
                              if (optIdx === cq.correctIndex) {
                                btnStyle = 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-semibold';
                              } else if (userSelected === optIdx) {
                                btnStyle = 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                onClick={() => handleCeeSelect(cq.id, optIdx)}
                                className={`p-3 rounded-xl border text-left text-xs transition flex items-start gap-2.5 ${btnStyle}`}
                              >
                                <span className="w-5 h-5 rounded-md bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-[#334155] text-gray-700 dark:text-gray-200 font-mono text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="mt-0.5 leading-snug">
                                  <MathMarkdown content={opt} />
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {isAnswered && (
                          <div className="mt-3 p-3.5 bg-[#f8f9fa] dark:bg-[#0f172a] rounded-xl border border-[#e3e3e3] dark:border-[#334155] text-xs space-y-2">
                            <div className="flex items-center gap-1.5 font-bold">
                              {userSelected === cq.correctIndex ? (
                                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Correct Answer!
                                </span>
                              ) : (
                                <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1">
                                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Incorrect. Correct Option is {String.fromCharCode(65 + cq.correctIndex)}
                                </span>
                              )}
                            </div>

                            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                              <MathMarkdown content={cq.explanation} />
                            </div>

                            {cq.trickNote && (
                              <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 rounded-lg text-amber-900 dark:text-amber-200 flex items-start gap-2">
                                <Lightbulb className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                                <div>
                                  <strong className="block text-amber-800 dark:text-amber-200 font-bold">CEE Shortcut Trick:</strong>
                                  <MathMarkdown content={cq.trickNote} />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
