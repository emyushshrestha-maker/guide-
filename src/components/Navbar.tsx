import React from 'react';
import {
  GraduationCap,
  Trash2,
  Volume2,
  Atom,
  Compass,
  Download,
  Moon,
  Sun,
  PanelLeft,
  Plus,
  Timer,
} from 'lucide-react';
import { SubjectCategory } from '../types';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  selectedSubject: SubjectCategory;
  onSubjectChange: (sub: SubjectCategory) => void;
  onOpenExamModal: () => void;
  onOpenInstallModal: () => void;
  onClearHistory: () => void;
  isSpeaking: boolean;
  onStopSpeech: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onNewChat: () => void;
  activeThreadTitle?: string | null;
  onOpenFocusLock?: (mins?: number) => void;
}

const SUBJECTS: SubjectCategory[] = [
  'General',
  'Physics',
  'Chemistry',
  'Biology',
  'Mathematics',
  'Computer Science',
  'General Science',
];

export const Navbar: React.FC<NavbarProps> = ({
  selectedSubject,
  onSubjectChange,
  onOpenExamModal,
  onOpenInstallModal,
  onClearHistory,
  isSpeaking,
  onStopSpeech,
  onToggleSidebar,
  sidebarOpen,
  onNewChat,
  activeThreadTitle,
  onOpenFocusLock,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#f8f9fa] dark:bg-[#0f172a] border-b border-[#e3e3e3] dark:border-[#1e293b] transition-colors">
      <div className="w-full max-w-none px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Side: Sidebar Toggle & Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleSidebar}
            className={`p-2 rounded-xl border transition shadow-2xs flex items-center justify-center ${
              sidebarOpen
                ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-[#1e293b] border-[#e3e3e3] dark:border-[#334155] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
            title={sidebarOpen ? 'Collapse Chat History Sidebar' : 'Open Chat History Sidebar'}
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onNewChat}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm shadow-2xs transition shrink-0"
            title="Start a brand new chat"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Chat</span>
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-[#e3e3e3] dark:border-[#334155]">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-sm tracking-wider">
              G
            </div>
            <span className="font-extrabold text-base tracking-wider text-[#1f1f1f] dark:text-white hidden xs:inline">
              GUIDE
            </span>
          </div>

          {activeThreadTitle && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 pl-2 border-l border-[#e3e3e3] dark:border-[#334155] max-w-[200px] xl:max-w-xs truncate">
              <span className="truncate text-gray-700 dark:text-gray-300 font-medium">
                {activeThreadTitle}
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Dark / Light Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold border transition shadow-2xs ${
              isDark
                ? 'bg-[#1e293b] hover:bg-[#334155] text-amber-300 border-[#334155]'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-[#e3e3e3]'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                <span className="hidden md:inline text-amber-200">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700 fill-slate-700/20" />
                <span className="hidden md:inline text-slate-700">Night</span>
              </>
            )}
          </button>

          {/* Subject Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#1e293b] border border-[#e3e3e3] dark:border-[#334155] rounded-full px-2.5 sm:px-3.5 py-1.5 text-xs text-[#1f1f1f] dark:text-[#f1f5f9] shadow-2xs">
            <Atom className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 hidden sm:inline" />
            <select
              value={selectedSubject}
              onChange={(e) => onSubjectChange(e.target.value as SubjectCategory)}
              className="bg-transparent text-[#1f1f1f] dark:text-[#f1f5f9] font-bold outline-none cursor-pointer text-xs"
            >
              {SUBJECTS.map((sub) => (
                <option key={sub} value={sub} className="bg-white dark:bg-[#1e293b] text-gray-800 dark:text-gray-100 font-medium">
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Focus Clock Button */}
          {onOpenFocusLock && (
            <button
              onClick={() => onOpenFocusLock(25)}
              className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 text-xs px-2.5 sm:px-3 py-1.5 rounded-full font-bold transition shadow-2xs"
              title="Launch Locked Focus Clock (25m, 30m, 1h)"
            >
              <Timer className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Focus Clock</span>
            </button>
          )}

          {/* Exam Mode Button */}
          <button
            onClick={onOpenExamModal}
            className="flex items-center gap-1.5 bg-black dark:bg-slate-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-slate-950 text-xs px-3 py-1.5 rounded-full font-bold transition shadow-sm"
            title="Generate custom NEB & CEE Exam Practice Set"
          >
            <GraduationCap className="w-3.5 h-3.5 text-blue-300 dark:text-blue-600" />
            <span className="hidden sm:inline">NEB & CEE</span>
          </button>

          {/* Install App Button */}
          <button
            onClick={onOpenInstallModal}
            className="hidden md:flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 text-xs px-3 py-1.5 rounded-full font-bold transition shadow-2xs"
            title="Install GUIDE as a Desktop / Mobile Application"
          >
            <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Install</span>
          </button>

          {/* Stop Audio Button if currently speaking */}
          {isSpeaking && (
            <button
              onClick={onStopSpeech}
              className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse"
              title="Stop voice reading"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Stop Voice</span>
            </button>
          )}

          {/* Clear History */}
          <button
            onClick={onClearHistory}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200/60 dark:hover:bg-slate-800 rounded-full transition text-xs flex items-center gap-1 font-medium"
            title="Clear Chat Conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Clear</span>
          </button>
        </div>
      </div>
    </header>
  );
};

