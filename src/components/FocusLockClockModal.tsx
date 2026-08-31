import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Power,
  Maximize2,
  Minimize2,
  Flame,
  Volume2,
  VolumeX,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Play,
  Pause,
  CheckCircle2,
  Target,
  Clock as ClockIcon,
  ShieldAlert,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface FocusLockClockModalProps {
  isOpen: boolean;
  initialMinutes?: number;
  onClose: () => void;
  onSessionComplete: (durationMinutes: number) => void;
}

export const FocusLockClockModal: React.FC<FocusLockClockModalProps> = ({
  isOpen,
  initialMinutes = 25,
  onClose,
  onSessionComplete,
}) => {
  const { isDark } = useTheme();
  const [durationMinutes, setDurationMinutes] = useState<number>(initialMinutes);
  const [timeLeft, setTimeLeft] = useState<number>(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [studyGoal, setStudyGoal] = useState<string>('NEB & CEE Medical/Engineering Preparation');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [ambientSound, setAmbientSound] = useState<'none' | 'whitenoise' | 'clock'>('none');
  const [showShutdownConfirm, setShowShutdownConfirm] = useState<boolean>(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const ambientOscRef = useRef<AudioNode | null>(null);

  // Sync initial minutes if prop changes
  useEffect(() => {
    if (isOpen) {
      setDurationMinutes(initialMinutes);
      setTimeLeft(initialMinutes * 60);
      setIsRunning(true);
      setIsCompleted(false);
      setShowShutdownConfirm(false);
    }
  }, [isOpen, initialMinutes]);

  // Current Wall Clock Time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Strict Anti-Close / Anti-Unload Lock
  useEffect(() => {
    if (!isOpen || !isRunning || isCompleted) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Standard browser confirmation prompt
      e.returnValue = 'Active Focus Session in Progress! You cannot close the app during your study time.';
      return e.returnValue;
    };

    // Block accidental browser closing
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Block keyboard escape from easily closing without shutdown
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowShutdownConfirm(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isRunning, isCompleted]);

  // Ambient sound synthesizer
  useEffect(() => {
    if (!soundEnabled || ambientSound === 'none' || !isRunning || isCompleted) {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      if (ambientSound === 'clock') {
        // Subtle soft ticking rhythm
        const tickGain = ctx.createGain();
        tickGain.gain.value = 0.05;
        tickGain.connect(ctx.destination);
      } else if (ambientSound === 'whitenoise') {
        // Gentle pinkish noise generator for deep focus
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          output[i] = (b0 + b1 + b2) * 0.05;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.03;
        whiteNoise.connect(gainNode);
        gainNode.connect(ctx.destination);
        whiteNoise.start();
        ambientOscRef.current = whiteNoise;
      }
    } catch (e) {
      console.warn('Focus ambient sound error:', e);
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [ambientSound, soundEnabled, isRunning, isCompleted]);

  // Main countdown timer engine
  useEffect(() => {
    let timer: any = null;
    if (isOpen && isRunning && timeLeft > 0 && !isCompleted) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, isRunning, timeLeft, isCompleted]);

  const handleComplete = () => {
    setIsRunning(false);
    setIsCompleted(true);
    onSessionComplete(durationMinutes);

    // Play victory celebratory sound
    if (soundEnabled) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const playNote = (freq: number, start: number, dur: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.25, start);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + dur);
          };
          const now = ctx.currentTime;
          playNote(523.25, now, 0.3);       // C5
          playNote(659.25, now + 0.15, 0.3); // E5
          playNote(783.99, now + 0.3, 0.3);  // G5
          playNote(1046.50, now + 0.45, 0.8); // C6
        }
      } catch (e) {
        console.warn('Victory chime error:', e);
      }
    }
  };

  const handleSelectPreset = (mins: number) => {
    setDurationMinutes(mins);
    setTimeLeft(mins * 60);
    setIsRunning(true);
    setIsCompleted(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Shut down focus session
  const handleExecuteShutdown = () => {
    setIsRunning(false);
    setShowShutdownConfirm(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onClose();
  };

  if (!isOpen) return null;

  const totalDurationSeconds = durationMinutes * 60;
  const elapsedSeconds = totalDurationSeconds - timeLeft;
  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / totalDurationSeconds) * 100));

  // Format MM:SS or HH:MM:SS
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // SVG Circular progress radius
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 text-slate-100 backdrop-blur-md overflow-hidden select-none"
      id="focus-lock-container"
    >
      {/* Background Animated Gradient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600 rounded-full filter blur-[128px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600 rounded-full filter blur-[128px] animate-pulse" />
      </div>

      <div className="relative w-full max-w-4xl h-full sm:h-[94vh] flex flex-col justify-between p-4 sm:p-8">
        {/* Top App Lock Status Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs">
              <Lock className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>STRICT FOCUS MODE ACTIVE</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-slate-400 text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
              <ClockIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>Current Time: {currentTimeStr}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Ambient Sound Toggle */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-full p-1 text-xs">
              <button
                onClick={() => setAmbientSound('none')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                  ambientSound === 'none' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Silent
              </button>
              <button
                onClick={() => setAmbientSound('whitenoise')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                  ambientSound === 'whitenoise' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pink Noise
              </button>
            </div>

            {/* Sound Mute */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
              title={soundEnabled ? 'Mute chimes' : 'Enable chimes'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Shut Down Session / Emergency Exit */}
            <button
              onClick={() => setShowShutdownConfirm(true)}
              className="flex items-center gap-1.5 bg-rose-600/30 hover:bg-rose-600 border border-rose-500 text-rose-200 hover:text-white px-3 py-1.5 rounded-full text-xs font-bold transition shadow-xs"
              title="Shut down focus session and unlock the app"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Shut Down Session</span>
            </button>
          </div>
        </div>

        {/* Center Clock & Focus Experience */}
        <div className="flex-1 flex flex-col items-center justify-center py-4 text-center space-y-6">
          {/* Study Goal Input / Banner */}
          <div className="w-full max-w-lg">
            <div className="flex items-center justify-center gap-2 text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">
              <Target className="w-4 h-4" />
              <span>Focus Objective</span>
            </div>
            <input
              type="text"
              value={studyGoal}
              onChange={(e) => setStudyGoal(e.target.value)}
              placeholder="What are you mastering today? (e.g. Wave Optics, Organic Chemistry)"
              className="w-full text-center bg-slate-900/60 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none transition"
            />
          </div>

          {/* Big Circular Focus Clock */}
          <div className="relative flex items-center justify-center my-2">
            <svg className="w-72 h-72 sm:w-80 sm:h-80 -rotate-90 transform" viewBox="0 0 300 300">
              {/* Background Dial Track */}
              <circle
                cx="150"
                cy="150"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="12"
                fill="transparent"
              />
              {/* Animated Progress Ring */}
              <circle
                cx="150"
                cy="150"
                r={radius}
                className={`transition-all duration-1000 ${
                  isCompleted ? 'stroke-emerald-500' : 'stroke-blue-500'
                }`}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Center Content inside Ring */}
            <div className="absolute flex flex-col items-center justify-center text-center space-y-1.5">
              {isCompleted ? (
                <div className="space-y-2 animate-bounce">
                  <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
                  <span className="text-xl font-black text-emerald-400 tracking-tight block">
                    SESSION COMPLETED!
                  </span>
                  <span className="text-xs text-slate-300">+{durationMinutes}m logged to your daily study total</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs uppercase tracking-widest">
                    <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Focusing</span>
                  </div>

                  <div className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-white drop-shadow-md">
                    {formatTime(timeLeft)}
                  </div>

                  <div className="text-xs text-slate-400 font-mono">
                    {Math.round(progressPercent)}% elapsed
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Duration Preset Selector */}
          {!isCompleted && (
            <div className="space-y-2">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold block">
                Select Focus Time Preset:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { label: '25 Min', mins: 25 },
                  { label: '30 Min', mins: 30 },
                  { label: '45 Min', mins: 45 },
                  { label: '1 Hour (60m)', mins: 60 },
                  { label: '90 Min', mins: 90 },
                ].map((item) => (
                  <button
                    key={item.mins}
                    onClick={() => handleSelectPreset(item.mins)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition shadow-xs ${
                      durationMinutes === item.mins
                        ? 'bg-blue-600 border-blue-400 text-white shadow-blue-900/40'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="flex items-center gap-3 pt-2">
            {!isCompleted ? (
              <>
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition shadow-md ${
                    isRunning
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isRunning ? 'Pause Focus' : 'Resume Focus'}</span>
                </button>

                <button
                  onClick={() => {
                    setTimeLeft(durationMinutes * 60);
                    setIsRunning(true);
                  }}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
                  title="Restart current timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={handleExecuteShutdown}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-900/50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Return to Study Dashboard</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Anti-Distraction Reminder Footer */}
        <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              App closing & tab switching are locked during your active focus block.
            </span>
          </div>

          <div className="text-slate-500">
            Powered by GUIDE Academic Focus Engine
          </div>
        </div>
      </div>

      {/* Emergency Shut Down Confirmation Modal */}
      {showShutdownConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Shut Down Active Focus Session?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                You currently have <span className="font-bold text-blue-400 font-mono">{formatTime(timeLeft)}</span> remaining in your focus study period. Are you sure you want to shut down and exit early?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowShutdownConfirm(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-xs font-bold transition"
              >
                Continue Studying
              </button>

              <button
                onClick={handleExecuteShutdown}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-xs"
              >
                Yes, Shut Down Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
