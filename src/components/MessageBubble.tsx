import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  User,
  Volume2,
  VolumeX,
  Layers,
  HelpCircle,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Lightbulb,
  ArrowRight,
  BookOpen,
  Award,
  Zap,
  Check,
  Copy,
  Loader2,
} from 'lucide-react';
import { ChatMessage, Diagram } from '../types';
import { DiagramCard } from './DiagramCard';
import { MathMarkdown } from './MathMarkdown';
import { speakText, stopSpeaking } from '../lib/speech';

interface MessageBubbleProps {
  message: ChatMessage;
  onSelectFollowUp: (prompt: string) => void;
  onOpenDiagramModal: (diagram: Diagram) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onSelectFollowUp,
  onOpenDiagramModal,
}) => {
  const [activeTab, setActiveTab] = useState<'main' | 'diagrams' | 'simplified' | 'summary' | 'exams'>('main');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealedSolutions, setRevealedSolutions] = useState<Record<number, boolean>>({});
  const [ceeSelections, setCeeSelections] = useState<Record<string, number>>({});

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  if (message.sender === 'user') {
    return (
      <div className="flex justify-end my-6 w-full">
        <div className="flex items-start gap-3.5 max-w-4xl w-full justify-end">
          <div className="flex flex-col items-end max-w-3xl">
            <span className="text-xs font-bold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-3 py-1 rounded-full border border-blue-200/60 dark:border-blue-800/80 mb-1.5 shadow-2xs">
              Dr Emyush Shrestha
            </span>
            <div className="bg-[#e8f0fe] dark:bg-[#172554] border border-blue-200 dark:border-blue-800/80 text-blue-900 dark:text-blue-100 px-6 py-4 rounded-2xl rounded-tr-xs shadow-2xs text-base sm:text-lg leading-relaxed w-full">
              <p className="whitespace-pre-wrap font-medium">{message.text}</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-6 shadow-xs font-bold text-sm" title="Dr Emyush Shrestha">
            ES
          </div>
        </div>
      </div>
    );
  }

  const res = message.response;
  if (!res) return null;

  const handleSpeak = (textToSpeak: string) => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speakText(textToSpeak, () => {
        setIsSpeaking(false);
      });
    }
  };

  const handleCopyText = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSolution = (index: number) => {
    setRevealedSolutions((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleCeeSelect = (ceeId: string, optionIdx: number) => {
    setCeeSelections((prev) => ({ ...prev, [ceeId]: optionIdx }));
  };

  const hasDiagrams = Boolean(res.isDiagramsLoading || (res.diagrams && res.diagrams.length > 0));
  const hasSimplified = Boolean(res.simplifiedAnswer && res.simplifiedAnswer.trim().length > 0 && res.simplifiedAnswer.trim() !== res.mainAnswer.trim());
  const hasSummary = Boolean(res.quickSummary && res.quickSummary.length > 0);
  const hasExams = Boolean((res.nebQuestions && res.nebQuestions.length > 0) || (res.ceeQuestions && res.ceeQuestions.length > 0));
  const isSimple = Boolean(res.isSimpleFact || (!hasDiagrams && !hasSimplified && !hasSummary && !hasExams));

  return (
    <div className="my-6 bg-white dark:bg-[#111827] border border-[#e3e3e3] dark:border-[#1e293b] rounded-2xl p-6 sm:p-8 shadow-2xs text-[#1f1f1f] dark:text-[#f1f5f9] space-y-6 w-full transition-colors">
      {/* Assistant Header & Feature Navigation Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#e3e3e3] dark:border-[#1e293b]">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 font-black text-sm tracking-wider shadow-2xs ${
            res.isQuickFire ? 'bg-amber-500' : 'bg-blue-600'
          }`}>
            {res.isQuickFire ? <Zap className="w-5 h-5 fill-white" /> : 'G'}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold tracking-wider text-[#1f1f1f] dark:text-white flex items-center gap-2">
              GUIDE
              {res.isQuickFire && (
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  ⚡ Quick-Fire
                </span>
              )}
            </h3>
            <p className="text-xs text-[#70757a] dark:text-gray-400">
              {res.isQuickFire ? (
                'Instant direct factual response'
              ) : res.isDiagramsLoading ? (
                <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering visual diagrams in background...
                </span>
              ) : isSimple ? (
                'Instant Direct Answer'
              ) : (
                `${res.diagrams?.length || 0} Visual Diagrams • NEB/CEE Practice`
              )}
            </p>
          </div>
        </div>

        {/* View Tabs Bar - Only rendered when additional views exist */}
        {!isSimple && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 bg-[#f8f9fa] dark:bg-[#0f172a] p-1.5 rounded-xl border border-[#e3e3e3] dark:border-[#1e293b] text-xs sm:text-sm">
            <button
              onClick={() => setActiveTab('main')}
              className={`px-3.5 py-2 rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'main'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Main Answer</span>
            </button>

            {hasDiagrams && (
              <button
                onClick={() => setActiveTab('diagrams')}
                className={`px-3.5 py-2 rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'diagrams'
                    ? 'bg-blue-600 text-white font-bold shadow-2xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-slate-800'
                }`}
              >
                {res.isDiagramsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                ) : (
                  <Layers className="w-4 h-4" />
                )}
                <span>
                  {res.isDiagramsLoading ? 'Diagrams (Generating...)' : `Diagrams (${res.diagrams?.length || 0})`}
                </span>
              </button>
            )}

            {hasSimplified && (
              <button
                onClick={() => setActiveTab('simplified')}
                className={`px-3.5 py-2 rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'simplified'
                    ? 'bg-amber-500 text-white font-bold shadow-2xs'
                    : 'text-amber-800 dark:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-950/50'
                }`}
                title="Explain simply to a person with no education in this topic"
              >
                <Zap className="w-4 h-4" />
                <span>Simplify (ELI5)</span>
              </button>
            )}

            {hasSummary && (
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-3.5 py-2 rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'summary'
                    ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Bullets</span>
              </button>
            )}

            {hasExams && (
              <button
                onClick={() => setActiveTab('exams')}
                className={`px-3.5 py-2 rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'exams'
                    ? 'bg-black dark:bg-slate-100 text-white dark:text-slate-950 font-bold shadow-2xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <Award className="w-4 h-4 text-blue-300 dark:text-blue-600" />
                <span>NEB & CEE</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: MAIN DETAILED ANSWER */}
      {(activeTab === 'main' || isSimple) && (
        <div className="space-y-5">
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-[#f8f9fa] dark:bg-[#0f172a] px-4 py-2 rounded-xl border border-[#e3e3e3] dark:border-[#1e293b]">
            <span className="font-medium">{isSimple ? 'Direct Answer' : 'Academic Explanation'}</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleSpeak(res.mainAnswer)}
                className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold transition"
                title="Instant high-quality voice reader"
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-4 h-4 text-rose-600 animate-pulse" />
                    <span className="text-rose-600">Stop Reading</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Instant Voice</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleCopyText(res.mainAnswer)}
                className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="w-full text-[#1f1f1f] dark:text-[#f1f5f9] text-base sm:text-lg leading-relaxed space-y-4">
            <MathMarkdown content={res.mainAnswer} />
          </div>

          {res.isDiagramsLoading && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 rounded-xl text-blue-900 dark:text-blue-200 text-xs sm:text-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  <strong>Immediate Answer Delivered!</strong> Generating 2-3 visual concept diagrams in the background...
                </span>
              </div>
              <button
                onClick={() => setActiveTab('diagrams')}
                className="text-xs font-bold text-blue-700 dark:text-blue-300 underline hover:text-blue-900 dark:hover:text-blue-100 shrink-0 ml-2"
              >
                View Diagrams
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DIAGRAMS (2-3 Visual Schematics) */}
      {activeTab === 'diagrams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#e8f0fe] dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 p-3 rounded-xl text-blue-900 dark:text-blue-200 text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>
                <strong>{res.diagrams?.length || 0} Visual Concepts</strong> generated for this topic. Click any diagram to open full reader mode with zoom controls!
              </span>
            </div>
          </div>

          {res.isDiagramsLoading ? (
            <div className="p-8 bg-[#f8f9fa] dark:bg-[#0f172a] border border-[#e3e3e3] dark:border-[#1e293b] rounded-2xl text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto" />
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Generating 2-3 Visual Schematics...</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Your text answer was delivered immediately! Custom vector diagrams and concept schematics are rendering in the background and will appear here shortly.
              </p>
            </div>
          ) : !res.diagrams || res.diagrams.length === 0 ? (
            <div className="p-8 bg-[#f8f9fa] dark:bg-[#0f172a] border border-[#e3e3e3] dark:border-[#1e293b] rounded-2xl text-center space-y-2 text-gray-500 dark:text-gray-400 text-xs">
              <p>No visual diagrams were generated for this topic.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {res.diagrams?.map((diag, idx) => (
                <DiagramCard
                  key={diag.id || idx}
                  diagram={diag}
                  index={idx}
                  onOpenModal={onOpenDiagramModal}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SIMPLIFIED (ELI5 Mode for Uneducated / Beginners) */}
      {activeTab === 'simplified' && (
        <div className="space-y-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 p-6 rounded-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200 dark:border-amber-800/80">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-base sm:text-lg">
              <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>Simplified Mode (ELI5 / Plain Words)</span>
            </div>
            <button
              onClick={() => handleSpeak(res.simplifiedAnswer)}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-amber-800 dark:text-amber-200 hover:text-amber-950 dark:hover:text-amber-100 bg-white dark:bg-[#1e293b] px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 shadow-2xs font-semibold transition"
              title="Instant voice reader"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-4 h-4 text-rose-600 animate-pulse" />
                  <span className="text-rose-600">Stop Reading</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-amber-600" />
                  <span>Instant Voice</span>
                </>
              )}
            </button>
          </div>

          <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed italic">
            "Here is the concept broken down with zero jargon or confusing terms:"
          </p>

          <div className="text-[#1f1f1f] dark:text-[#f1f5f9] text-base sm:text-lg leading-relaxed bg-white dark:bg-[#1e293b] p-5 rounded-xl border border-amber-200/80 dark:border-amber-800/60 shadow-2xs">
            <MathMarkdown content={res.simplifiedAnswer} />
          </div>
        </div>
      )}

      {/* TAB 4: BULLET SUMMARY */}
      {activeTab === 'summary' && (
        <div className="space-y-4 bg-[#f8f9fa] dark:bg-[#0f172a] p-6 rounded-2xl border border-[#e3e3e3] dark:border-[#1e293b]">
          <h4 className="text-xs sm:text-sm uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Quick Bullet Points Summary
          </h4>
          <ul className="space-y-3">
            {res.quickSummary?.map((bullet, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3.5 bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-[#e3e3e3] dark:border-[#334155] text-base sm:text-lg text-[#1f1f1f] dark:text-[#f1f5f9]"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-2.5" />
                <div className="leading-relaxed flex-1">
                  <MathMarkdown content={bullet} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* TAB 5: NEB & CEE EXAM PRACTICE */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          {/* NEB Section */}
          <div className="space-y-4 bg-[#f8f9fa] dark:bg-[#0f172a] p-5 sm:p-6 rounded-2xl border border-[#e3e3e3] dark:border-[#1e293b]">
            <div className="flex items-center justify-between border-b border-[#e3e3e3] dark:border-[#1e293b] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-bold text-xs sm:text-sm border border-blue-200 dark:border-blue-800/80">
                  NEB High School Board
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">
                  Subjective Questions (2-3 Questions)
                </h4>
              </div>
            </div>

            <div className="space-y-5">
              {res.nebQuestions?.map((q, idx) => (
                <div key={idx} className="bg-white dark:bg-[#1e293b] p-5 rounded-xl border border-[#e3e3e3] dark:border-[#334155] space-y-4 shadow-2xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-base sm:text-lg font-semibold text-[#1f1f1f] dark:text-[#f1f5f9] flex items-start gap-2.5">
                      <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">Q{idx + 1}.</span>
                      <MathMarkdown content={q.question} />
                    </div>
                    <span className="px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 rounded-lg border border-blue-200 dark:border-blue-800 shrink-0">
                      {q.marks}
                    </span>
                  </div>

                  {q.keyConcepts && q.keyConcepts.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Key Concepts:</span>
                      {q.keyConcepts.map((concept, cIdx) => (
                        <span key={cIdx} className="bg-gray-100 dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 px-2.5 py-0.5 rounded border border-gray-200 dark:border-[#334155] font-medium">
                          {concept}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => toggleSolution(idx)}
                    className="flex items-center gap-2 text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900/80 px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-800 transition"
                  >
                    {revealedSolutions[idx] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{revealedSolutions[idx] ? 'Hide Solution' : 'Reveal Step-by-Step Solution'}</span>
                  </button>

                  {revealedSolutions[idx] && (
                    <div className="p-4 bg-[#f8f9fa] dark:bg-[#0f172a] rounded-xl text-base sm:text-lg text-[#1f1f1f] dark:text-[#f1f5f9] border border-[#e3e3e3] dark:border-[#334155] leading-relaxed animate-fadeIn">
                      <strong className="text-emerald-700 dark:text-emerald-400 block mb-2 font-bold text-sm uppercase tracking-wide">Answer & Marking Scheme Solution:</strong>
                      <MathMarkdown content={q.solution} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CEE Entrance Section with #fcf8f0 style */}
          <div className="bg-[#fcf8f0] dark:bg-[#1a1813] p-5 sm:p-6 rounded-2xl border border-[#ede2cf] dark:border-[#3a3325] space-y-5">
            <div className="flex items-center justify-between border-b border-[#ede2cf] dark:border-[#3a3325] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-[#856404] dark:text-amber-300 uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 px-3 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                  CEE Entrance Practice
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                  Multiple Choice MCQs & High-Yield Tricks
                </h4>
              </div>
            </div>

            <div className="space-y-6">
              {res.ceeQuestions?.map((cq, idx) => {
                const ceeId = cq.id || `cee-${idx}`;
                const userSelected = ceeSelections[ceeId];
                const isAnswered = userSelected !== undefined;

                return (
                  <div key={ceeId} className="bg-white dark:bg-[#1e293b] p-5 rounded-xl border border-[#ede2cf] dark:border-[#334155] space-y-4 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <span className="text-blue-600 dark:text-blue-400 font-bold font-mono text-base sm:text-lg">MCQ {idx + 1}.</span>
                      <div className="text-base sm:text-lg font-semibold text-[#1f1f1f] dark:text-[#f1f5f9]">
                        <MathMarkdown content={cq.question} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {cq.options?.map((opt, optIdx) => {
                        let btnStyle = 'bg-[#f8f9fa] dark:bg-[#0f172a] border-[#e3e3e3] dark:border-[#334155] text-[#1f1f1f] dark:text-[#f1f5f9] hover:bg-gray-100 dark:hover:bg-slate-800';
                        if (isAnswered) {
                          if (optIdx === cq.correctIndex) {
                            btnStyle = 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold';
                          } else if (userSelected === optIdx) {
                            btnStyle = 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            onClick={() => handleCeeSelect(ceeId, optIdx)}
                            className={`p-3.5 rounded-xl border text-left text-sm sm:text-base transition flex items-start gap-3 ${btnStyle}`}
                          >
                            <span className="w-6 h-6 rounded-lg bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-[#334155] text-gray-800 dark:text-gray-200 font-mono text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
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
                      <div className="mt-4 p-4 bg-[#f8f9fa] dark:bg-[#0f172a] rounded-xl border border-[#e3e3e3] dark:border-[#334155] text-sm sm:text-base space-y-3 animate-fadeIn">
                        <div className="flex items-center gap-2 font-bold text-base">
                          {userSelected === cq.correctIndex ? (
                            <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Correct Answer!
                            </span>
                          ) : (
                            <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" /> Incorrect. Correct Option is {String.fromCharCode(65 + cq.correctIndex)}
                            </span>
                          )}
                        </div>

                        <div className="text-gray-800 dark:text-gray-200 leading-relaxed">
                          <MathMarkdown content={cq.explanation} />
                        </div>

                        {cq.trickNote && (
                          <div className="mt-3 p-3.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 rounded-xl text-amber-900 dark:text-amber-200 flex items-start gap-3">
                            <Lightbulb className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div className="text-sm sm:text-base">
                              <strong className="block text-amber-900 dark:text-amber-200 font-extrabold text-xs uppercase tracking-wider mb-0.5">CEE High-Yield Trick / Shortcut:</strong>
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

      {/* Suggested Follow-up Questions Pills */}
      {res.followUps && res.followUps.length > 0 && (
        <div className="pt-4 border-t border-[#e3e3e3] dark:border-[#1e293b] space-y-2.5">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Suggested Follow-up Questions:
          </p>
          <div className="flex flex-wrap gap-2.5">
            {res.followUps.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => onSelectFollowUp(prompt)}
                className="text-xs sm:text-sm px-4 py-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-[#334155] rounded-full text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition flex items-center gap-2 text-left shadow-2xs font-semibold"
              >
                <span>{prompt}</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

