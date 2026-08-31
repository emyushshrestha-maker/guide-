import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { MessageBubble } from './components/MessageBubble';
import { InputArea } from './components/InputArea';
import { DiagramViewerModal } from './components/DiagramViewerModal';
import { ExamPracticeModal } from './components/ExamPracticeModal';
import { InstallAppModal } from './components/InstallAppModal';
import { PomodoroTimer } from './components/PomodoroTimer';
import { FocusLockClockModal } from './components/FocusLockClockModal';
import { ChatMessage, Diagram, SubjectCategory } from './types';
import { stopSpeaking } from './lib/speech';
import {
  Sparkles,
  Layers,
  Zap,
  GraduationCap,
  Mic,
  Loader2,
  BookOpen,
  Menu,
  X,
  Compass,
  Plus,
  MessageSquare,
  Trash2,
  Clock,
  User,
  Search,
  Download,
} from 'lucide-react';

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  subject: SubjectCategory;
  timestamp: number;
}

const THREADS_STORAGE_KEY = 'guide_chat_threads_v2';

export default function App() {
  // Load question threads from localStorage with fallback & migration
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    try {
      const saved = localStorage.getItem(THREADS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Migration from old single-thread storage key
      const oldMessages = localStorage.getItem('gemini_tutor_messages_v1');
      if (oldMessages) {
        const msgs: ChatMessage[] = JSON.parse(oldMessages);
        if (Array.isArray(msgs) && msgs.length > 0) {
          const firstUserMsg = msgs.find((m) => m.sender === 'user')?.text || 'Previous Questions';
          return [
            {
              id: `thread-${Date.now()}`,
              title: firstUserMsg,
              messages: msgs,
              subject: 'General',
              timestamp: Date.now(),
            },
          ];
        }
      }
    } catch (e) {
      console.error('Failed to parse history threads', e);
    }
    return [];
  });

  // Always start with a clean new screen when opening or restarting the app
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const [selectedSubject, setSelectedSubject] = useState<SubjectCategory>('General');
  const [isQuickFire, setIsQuickFire] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeDiagram, setActiveDiagram] = useState<Diagram | null>(null);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isFocusLockOpen, setIsFocusLockOpen] = useState(false);
  const [focusLockDuration, setFocusLockDuration] = useState<number>(25);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen for PWA beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Sync threads state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(threads));
    } catch (e) {
      console.error('Failed to save threads to localStorage', e);
    }
  }, [threads]);

  // Derive current messages from activeThreadId
  const activeThread = threads.find((t) => t.id === activeThreadId);
  const messages = activeThread ? activeThread.messages : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleNewQuestionThread = () => {
    setActiveThreadId(null);
    setSidebarOpen(false);
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
    };

    let targetThreadId = activeThreadId;

    if (!targetThreadId || !threads.some((t) => t.id === targetThreadId)) {
      // Create new thread
      const newThread: ChatThread = {
        id: `thread-${Date.now()}`,
        title: text.length > 38 ? text.slice(0, 38) + '...' : text,
        messages: [userMsg],
        subject: selectedSubject,
        timestamp: Date.now(),
      };

      setThreads((prev) => [newThread, ...prev]);
      targetThreadId = newThread.id;
      setActiveThreadId(newThread.id);
    } else {
      // Append user message to existing active thread
      setThreads((prev) =>
        prev.map((t) =>
          t.id === targetThreadId
            ? {
                ...t,
                messages: [...t.messages, userMsg],
                timestamp: Date.now(),
              }
            : t
        )
      );
    }

    setIsLoading(true);

    try {
      const currentThread = threads.find((t) => t.id === targetThreadId);
      const historyContext = currentThread ? currentThread.messages.slice(-6) : [userMsg];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          subject: selectedSubject,
          conversationHistory: historyContext,
          quickFire: isQuickFire,
        }),
      });

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          throw new Error('The server connection was interrupted. Please resubmit your question.');
        }
        throw new Error('Invalid response received from server.');
      }

      if (!response.ok) {
        throw new Error(data?.error || data?.details || `Server returned error (${response.status})`);
      }

      const msgId = `msg-${Date.now() + 1}`;

      const shouldFetchDiagrams = Boolean(data.needsDiagrams && !data.isSimpleFact && data.mainAnswer.length > 200);

      const assistantMsg: ChatMessage = {
        id: msgId,
        sender: 'assistant',
        text: '',
        response: {
          ...data,
          diagrams: [],
          isDiagramsLoading: shouldFetchDiagrams,
        },
        timestamp: Date.now(),
      };

      // Deliver text answer immediately to the active thread
      setThreads((prev) =>
        prev.map((t) =>
          t.id === targetThreadId
            ? {
                ...t,
                messages: [...t.messages, assistantMsg],
              }
            : t
        )
      );
      setIsLoading(false);

      // Asynchronously fetch background concept diagrams only when academically relevant
      if (shouldFetchDiagrams) {
        fetch('/api/generate-diagrams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            mainAnswer: data.mainAnswer,
            subject: selectedSubject,
          }),
        })
          .then((res) => (res.ok ? res.json() : Promise.reject('Diagram generation error')))
          .then((diagData) => {
            setThreads((prev) =>
              prev.map((t) =>
                t.id === targetThreadId
                  ? {
                      ...t,
                      messages: t.messages.map((msg) =>
                        msg.id === msgId && msg.response
                          ? {
                              ...msg,
                              response: {
                                ...msg.response,
                                diagrams: diagData.diagrams || [],
                                isDiagramsLoading: false,
                              },
                            }
                          : msg
                      ),
                    }
                  : t
              )
            );
          })
          .catch((err) => {
            console.warn('Background diagram generation skipped:', err);
            setThreads((prev) =>
              prev.map((t) =>
                t.id === targetThreadId
                  ? {
                      ...t,
                      messages: t.messages.map((msg) =>
                        msg.id === msgId && msg.response
                          ? {
                              ...msg,
                              response: {
                                ...msg.response,
                                isDiagramsLoading: false,
                              },
                            }
                          : msg
                      ),
                    }
                  : t
              )
            );
          });
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'assistant',
        text: '',
        response: {
          mainAnswer: `⚠️ **Unable to generate response.**\n\n${err?.message || 'Please check connection.'}`,
          simplifiedAnswer: 'An error occurred while connecting to the server.',
          quickSummary: ['Service temporarily unavailable', 'Retry your request'],
          diagrams: [],
          isDiagramsLoading: false,
          nebQuestions: [],
          ceeQuestions: [],
          followUps: ['Try again', 'Ask a simpler question'],
        },
        timestamp: Date.now(),
      };

      setThreads((prev) =>
        prev.map((t) =>
          t.id === targetThreadId
            ? {
                ...t,
                messages: [...t.messages, errorMsg],
              }
            : t
        )
      );
      setIsLoading(false);
    }
  };

  const handleDeleteThread = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (activeThreadId === threadId) {
      const remaining = threads.filter((t) => t.id !== threadId);
      setActiveThreadId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleClearAllHistory = () => {
    if (confirm('Are you sure you want to clear all question history?')) {
      stopSpeaking();
      setIsSpeaking(false);
      setThreads([]);
      setActiveThreadId(null);
      localStorage.removeItem(THREADS_STORAGE_KEY);
      localStorage.removeItem('gemini_tutor_messages_v1');
    }
  };

  const handleStopSpeech = () => {
    stopSpeaking();
    setIsSpeaking(false);
  };

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#0b0f19] text-[#1f1f1f] dark:text-[#f1f5f9] flex flex-row font-sans selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100 transition-colors overflow-x-hidden">
      {/* Mobile Backdrop for Drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden animate-fadeIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Collapsible History Drawer like Gemini App */}
      <aside
        className={`fixed lg:sticky top-0 h-screen z-50 w-72 bg-[#f8f9fa] dark:bg-[#0f172a] border-r border-[#e3e3e3] dark:border-[#1e293b] flex flex-col p-4 transition-all duration-200 shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:-ml-72'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-sm tracking-wider">
              G
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-wider text-[#1f1f1f] dark:text-white">
                GUIDE
              </span>
              <span className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold tracking-tight">
                For Dr Emyush Shrestha
              </span>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 transition"
            title="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Question Button */}
        <button
          onClick={handleNewQuestionThread}
          className="w-full mb-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-xs"
          title="Start a fresh question screen"
        >
          <Plus className="w-4 h-4" />
          <span>New Question Thread</span>
        </button>

        {/* Search History Filter */}
        {threads.length > 0 && (
          <div className="mb-3 relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search past questions..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-white dark:bg-[#1e293b] border border-[#e3e3e3] dark:border-[#334155] rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-400 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        )}

        {/* Navigation & Question History List */}
        <nav className="flex-grow space-y-4 overflow-y-auto pr-1">
          {/* Pomodoro Study Timer Widget */}
          <div>
            <PomodoroTimer
              onOpenFocusLock={(mins) => {
                setFocusLockDuration(mins || 25);
                setIsFocusLockOpen(true);
              }}
            />
          </div>

          {/* Question History Section */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] uppercase tracking-wider text-[#70757a] dark:text-gray-400 font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                Past Chats ({threads.length})
              </span>
              {threads.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  className="text-[10px] text-gray-400 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 font-medium transition"
                  title="Clear all question history"
                >
                  Clear All
                </button>
              )}
            </div>

            {filteredThreads.length > 0 ? (
              <ul className="space-y-1.5">
                {filteredThreads.map((thread) => {
                  const isActive = thread.id === activeThreadId;
                  const dateStr = new Date(thread.timestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <li
                      key={thread.id}
                      onClick={() => {
                        setActiveThreadId(thread.id);
                        if (window.innerWidth < 1024) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={`group p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-semibold shadow-2xs'
                          : 'bg-white dark:bg-[#1e293b] border-[#e3e3e3] dark:border-[#334155] text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-[#334155]/60 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-2 overflow-hidden">
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                        <div className="truncate">
                          <p className="truncate text-xs">{thread.title}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">
                            {dateStr} • {thread.messages.length} msgs
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteThread(e, thread.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition"
                        title="Delete this question thread"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : threads.length > 0 ? (
              <p className="text-xs text-gray-400 px-2 italic">No questions match search.</p>
            ) : (
              <div className="p-3 bg-white dark:bg-[#1e293b] border border-[#e3e3e3] dark:border-[#334155] rounded-xl text-center space-y-1 text-gray-400 text-xs">
                <p className="font-medium text-gray-500 dark:text-gray-300">No questions yet</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">Your chats will be automatically archived here.</p>
              </div>
            )}
          </div>

          {/* Curriculum Modes */}
          <div className="pt-2 space-y-1.5 border-t border-[#e3e3e3] dark:border-[#1e293b]">
            <p className="text-[10px] uppercase tracking-wider text-[#70757a] dark:text-gray-400 font-bold mb-2 px-1">
              Exam & App Tools
            </p>
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="w-full text-left px-3 py-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100/80 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-xs font-bold flex items-center gap-2 border border-blue-200/80 dark:border-blue-800/80 transition"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Install App to Device</span>
            </button>
            <button
              onClick={() => setIsExamModalOpen(true)}
              className="w-full text-left px-3 py-2 rounded-xl bg-[#e8f0fe] dark:bg-[#1e293b] text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-2 border border-blue-200/60 dark:border-[#334155]"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>NEB Board Question Sets</span>
            </button>
            <button
              onClick={() => setIsExamModalOpen(true)}
              className="w-full text-left px-3 py-2 rounded-xl bg-white dark:bg-[#1e293b] hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-medium flex items-center gap-2 border border-[#e3e3e3] dark:border-[#334155] transition"
            >
              <GraduationCap className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              <span>CEE Entrance Prep</span>
            </button>
          </div>
        </nav>

        {/* User Card at Sidebar Bottom */}
        <div className="mt-auto pt-3 border-t border-[#e3e3e3] dark:border-[#1e293b]">
          <div className="p-3 bg-white dark:bg-[#1e293b] border border-[#e3e3e3] dark:border-[#334155] rounded-xl flex items-center gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              ES
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">Dr Emyush Shrestha</h4>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Academic Account Active</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main View Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navigation Top Header */}
        <Navbar
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubject}
          onOpenExamModal={() => setIsExamModalOpen(true)}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
          onClearHistory={handleClearAllHistory}
          isSpeaking={isSpeaking}
          onStopSpeech={handleStopSpeech}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          sidebarOpen={sidebarOpen}
          onNewChat={handleNewQuestionThread}
          activeThreadTitle={activeThread?.title}
          onOpenFocusLock={(mins) => {
            setFocusLockDuration(mins || 25);
            setIsFocusLockOpen(true);
          }}
        />

        {/* Main Content Scroll Area - Full Screen Width */}
        <main className="flex-1 w-full max-w-none px-4 sm:px-8 lg:px-12 py-6 flex flex-col">
          {/* Clean Frontal Screen for Dr Emyush Shrestha */}
          {messages.length === 0 && (
            <div className="my-auto py-12 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6 animate-fadeIn w-full">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/80 flex items-center justify-center shadow-xs">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Welcome Dr Emyush Shrestha
                </p>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                  What would you like to study today?
                </h2>
              </div>

              {/* Minimal Clean Topic Starter Pills */}
              <div className="pt-4 flex flex-wrap items-center justify-center gap-2 max-w-xl">
                {[
                  'Young’s Double Slit Experiment',
                  'Markovnikov vs Anti-Markovnikov Rule',
                  'Cardiac Cycle & ECG Curves',
                  'Simple Harmonic Motion',
                  'DNA Replication Mechanism',
                  'Refraction through Prism',
                ].map((topic) => (
                  <button
                    key={topic}
                    onClick={() => handleSendMessage(topic)}
                    className="px-3.5 py-2 text-xs sm:text-sm font-medium rounded-full bg-white dark:bg-[#1e293b] hover:bg-blue-50 dark:hover:bg-blue-950/50 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-[#334155] hover:border-blue-300 dark:hover:border-blue-700 transition shadow-2xs"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Stream */}
          {messages.length > 0 && (
            <div className="flex-1 space-y-6 mb-6">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onSelectFollowUp={handleSendMessage}
                  onOpenDiagramModal={(diag) => setActiveDiagram(diag)}
                />
              ))}

              {isLoading && (
                <div className={`my-6 border rounded-xl p-5 shadow-2xs flex items-center gap-4 animate-pulse ${
                  isQuickFire
                    ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                    : 'bg-white dark:bg-[#1e293b] border-[#e3e3e3] dark:border-[#334155]'
                }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isQuickFire
                      ? 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400'
                      : 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400'
                  }`}>
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1f1f1f] dark:text-white">
                      {isQuickFire ? '⚡ Quick-Fire: delivering instant factual answer...' : 'GUIDE is preparing your comprehensive masterclass...'}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {isQuickFire
                        ? 'Direct response with minimal latency'
                        : 'Formulating unrestricted in-depth explanation, ELI5 analogy, and exam practice...'}
                    </p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Fixed Chat Input Area */}
        <div className="sticky bottom-0 z-30 bg-[#fdfdfd]/95 dark:bg-[#0b0f19]/95 backdrop-blur-md pt-2 border-t border-[#e3e3e3]/60 dark:border-[#1e293b]/80">
          <InputArea
            onSend={handleSendMessage}
            isLoading={isLoading}
            selectedSubject={selectedSubject}
            isQuickFire={isQuickFire}
            onToggleQuickFire={() => setIsQuickFire((prev) => !prev)}
          />
        </div>
      </div>

      {/* Diagram Fullscreen Modal */}
      <DiagramViewerModal
        diagram={activeDiagram}
        onClose={() => setActiveDiagram(null)}
      />

      {/* NEB & CEE Exam Practice Generator Modal */}
      <ExamPracticeModal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        selectedSubject={selectedSubject}
      />

      {/* PWA App Install Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onPromptTriggered={() => setDeferredPrompt(null)}
      />

      {/* Locked Focus Clock Modal */}
      <FocusLockClockModal
        isOpen={isFocusLockOpen}
        initialMinutes={focusLockDuration}
        onClose={() => setIsFocusLockOpen(false)}
        onSessionComplete={(mins) => {
          // Log stats to local storage for daily tracker
          try {
            const STATS_KEY = 'guide_pomodoro_stats_v1';
            const today = new Date().toISOString().split('T')[0];
            const saved = localStorage.getItem(STATS_KEY);
            let stats = { date: today, totalFocusedSeconds: 0, completedPomodoros: 0 };
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.date === today) stats = parsed;
            }
            stats.totalFocusedSeconds += mins * 60;
            stats.completedPomodoros += 1;
            localStorage.setItem(STATS_KEY, JSON.stringify(stats));
          } catch (e) {
            console.error(e);
          }
        }}
      />
    </div>
  );
}
