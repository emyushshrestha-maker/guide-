import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Timer,
  Coffee,
  Flame,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Sparkles,
  Award,
  Lock,
  Clock,
} from 'lucide-react';

export type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak';

interface PomodoroStats {
  date: string;
  totalFocusedSeconds: number;
  completedPomodoros: number;
}

interface PomodoroTimerProps {
  onOpenFocusLock?: (mins?: number) => void;
}

const STATS_KEY = 'guide_pomodoro_stats_v1';
const TIMER_STATE_KEY = 'guide_pomodoro_active_state_v1';

const PRESET_DURATIONS: Record<PomodoroMode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

// Play a pleasant chime sound on completion via Web Audio API
function playChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Multi-tone soothing bell
    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playNote(523.25, now, 0.4);       // C5
    playNote(659.25, now + 0.15, 0.4); // E5
    playNote(783.99, now + 0.3, 0.7);  // G5
    playNote(1046.5, now + 0.45, 1.0); // C6
  } catch (e) {
    console.warn('Audio chime playback error:', e);
  }
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onOpenFocusLock }) => {
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [timeLeft, setTimeLeft] = useState<number>(PRESET_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [customFocusMins, setCustomFocusMins] = useState<number>(25);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Daily statistics
  const [stats, setStats] = useState<PomodoroStats>(() => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const saved = localStorage.getItem(STATS_KEY);
      if (saved) {
        const parsed: PomodoroStats = JSON.parse(saved);
        if (parsed.date === today) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return {
      date: today,
      totalFocusedSeconds: 0,
      completedPomodoros: 0,
    };
  });

  // Track focused session seconds
  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Persist stats
  useEffect(() => {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {
      console.error(e);
    }
  }, [stats]);

  // Request browser notification permission once user interacts
  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  // Timer Tick Engine
  useEffect(() => {
    let interval: any = null;

    if (isRunning) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer Finished!
            handleTimerComplete();
            return 0;
          }
          // If in focus mode, track 1 second of focused learning time
          if (modeRef.current === 'focus') {
            setStats((prevStats) => {
              const today = new Date().toISOString().split('T')[0];
              const isSameDay = prevStats.date === today;
              return {
                date: today,
                totalFocusedSeconds: (isSameDay ? prevStats.totalFocusedSeconds : 0) + 1,
                completedPomodoros: isSameDay ? prevStats.completedPomodoros : 0,
              };
            });
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    
    if (soundEnabled) {
      playChimeSound();
    }

    if (mode === 'focus') {
      // Increment completed pomodoros
      setStats((prevStats) => {
        const today = new Date().toISOString().split('T')[0];
        const isSameDay = prevStats.date === today;
        return {
          date: today,
          totalFocusedSeconds: isSameDay ? prevStats.totalFocusedSeconds : 0,
          completedPomodoros: (isSameDay ? prevStats.completedPomodoros : 0) + 1,
        };
      });

      // Browser Notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🎯 Focus Session Completed!', {
          body: 'Great academic focus! Time for a short 5-minute break.',
          icon: '/icon-192.png',
        });
      }

      // Switch to short break
      setMode('shortBreak');
      setTimeLeft(PRESET_DURATIONS.shortBreak);
    } else {
      // Break finished
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('☕ Break Finished!', {
          body: 'Ready to dive back into your study questions?',
          icon: '/icon-192.png',
        });
      }

      // Switch to focus
      setMode('focus');
      setTimeLeft(customFocusMins * 60);
    }
  };

  const handleTogglePlay = () => {
    requestNotificationPermission();
    if (timeLeft === 0) {
      const duration = mode === 'focus' ? customFocusMins * 60 : PRESET_DURATIONS[mode];
      setTimeLeft(duration);
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    const duration = mode === 'focus' ? customFocusMins * 60 : PRESET_DURATIONS[mode];
    setTimeLeft(duration);
  };

  const handleSwitchMode = (newMode: PomodoroMode) => {
    setIsRunning(false);
    setMode(newMode);
    if (newMode === 'focus') {
      setTimeLeft(customFocusMins * 60);
    } else {
      setTimeLeft(PRESET_DURATIONS[newMode]);
    }
  };

  const handleSetFocusDuration = (mins: number) => {
    setCustomFocusMins(mins);
    if (mode === 'focus') {
      setIsRunning(false);
      setTimeLeft(mins * 60);
    }
  };

  // Anti-close protection when timer is active in focus mode
  useEffect(() => {
    if (!isRunning || mode !== 'focus') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Focus session active! Leaving will interrupt your study time.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isRunning, mode]);

  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format total focused time
  const formatFocusedHoursMinutes = (totalSeconds: number) => {
    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Calculate percentage
  const totalDuration = mode === 'focus' ? customFocusMins * 60 : PRESET_DURATIONS[mode];
  const progressPercent = Math.min(100, Math.max(0, ((totalDuration - timeLeft) / totalDuration) * 100));

  return (
    <div className="bg-white dark:bg-[#1e293b] border border-[#e3e3e3] dark:border-[#334155] rounded-xl overflow-hidden shadow-2xs transition-all duration-200">
      {/* Header bar / Mini summary */}
      <div className="p-3 bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-slate-800 dark:to-blue-950/40 border-b border-gray-100 dark:border-[#334155] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-white transition-colors ${
              mode === 'focus'
                ? isRunning
                  ? 'bg-blue-600 animate-pulse'
                  : 'bg-blue-600'
                : 'bg-emerald-600'
            }`}
          >
            {mode === 'focus' ? <Flame className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {mode === 'focus' ? 'Study Timer' : mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
              </span>
              {isRunning && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              )}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
              {formatFocusedHoursMinutes(stats.totalFocusedSeconds)} focused today
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            title={soundEnabled ? 'Sound enabled' : 'Sound muted'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-gray-400" />}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            title={isExpanded ? 'Collapse timer' : 'Expand timer options'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Timer Display & Quick Controls */}
      <div className="p-3 space-y-3">
        {/* Mode Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-gray-100/80 dark:bg-[#0f172a] p-1 rounded-lg text-[10px] font-bold">
          <button
            onClick={() => handleSwitchMode('focus')}
            className={`py-1 rounded-md transition ${
              mode === 'focus'
                ? 'bg-white dark:bg-[#1e293b] text-blue-700 dark:text-blue-400 shadow-2xs font-extrabold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Focus
          </button>
          <button
            onClick={() => handleSwitchMode('shortBreak')}
            className={`py-1 rounded-md transition ${
              mode === 'shortBreak'
                ? 'bg-white dark:bg-[#1e293b] text-emerald-700 dark:text-emerald-400 shadow-2xs font-extrabold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Short (5m)
          </button>
          <button
            onClick={() => handleSwitchMode('longBreak')}
            className={`py-1 rounded-md transition ${
              mode === 'longBreak'
                ? 'bg-white dark:bg-[#1e293b] text-emerald-700 dark:text-emerald-400 shadow-2xs font-extrabold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Long (15m)
          </button>
        </div>

        {/* Countdown & Progress bar */}
        <div className="text-center space-y-1.5 py-1">
          <div className="font-mono text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            {formatTime(timeLeft)}
          </div>

          <div className="w-full bg-gray-100 dark:bg-[#0f172a] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                mode === 'focus' ? 'bg-blue-600' : 'bg-emerald-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleTogglePlay}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : mode === 'focus'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{timeLeft === 0 ? 'Restart' : 'Start Focus'}</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 bg-gray-50 dark:bg-[#0f172a] hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-[#334155] rounded-lg transition"
            title="Reset Timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleTimerComplete}
            className="p-1.5 bg-gray-50 dark:bg-[#0f172a] hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-[#334155] rounded-lg transition"
            title="Skip to next session"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Lock-In Focus Screen Trigger */}
        {onOpenFocusLock && (
          <button
            onClick={() => onOpenFocusLock(customFocusMins)}
            className="w-full py-1.5 px-3 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition shadow-xs"
            title="Open full-screen locked Focus Clock (25m, 30m, 1h)"
          >
            <Lock className="w-3.5 h-3.5 text-blue-200" />
            <span>Open Locked Focus Clock</span>
          </button>
        )}

        {/* Collapsible Options & Study Presets */}
        {isExpanded && (
          <div className="pt-2.5 border-t border-gray-100 dark:border-[#334155] space-y-2.5 text-xs animate-fadeIn">
            {/* Focus presets */}
            <div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block mb-1.5">
                Focus Duration Presets:
              </span>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: '25m', val: 25 },
                  { label: '30m', val: 30 },
                  { label: '45m', val: 45 },
                  { label: '1 hour', val: 60 },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => handleSetFocusDuration(item.val)}
                    className={`py-1 rounded-md text-[11px] font-semibold border transition ${
                      customFocusMins === item.val && mode === 'focus'
                        ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold'
                        : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-[#334155] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Daily stats summary card */}
            <div className="p-2 bg-slate-50 dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#334155] rounded-lg flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Today's Sessions:</span>
              </div>
              <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                <span className="text-blue-700 dark:text-blue-400 font-extrabold">{stats.completedPomodoros}</span>
                <span className="text-gray-400 font-normal">pomodoros</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
