import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Loader2,
  CheckCircle2,
  Wand2,
  Volume2,
  X,
  Zap,
  BookOpen,
} from 'lucide-react';
import { createSpeechRecognizer, isSpeechRecognitionSupported } from '../lib/speech';

interface InputAreaProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  selectedSubject?: string;
  isQuickFire: boolean;
  onToggleQuickFire: () => void;
}

const STARTER_PROMPTS = [
  'Explain Photosynthesis & Light Reactions step by step',
  'Derive Newton\'s Laws of Motion & Calculus formulas',
  'Structure of Benzene & Complete Reaction Mechanism',
  'DNA Replication & all Enzyme Functions in full detail',
  'Ohm\'s Law, Circuit Proofs & Kirchhoff\'s Laws',
];

const QUICK_FIRE_STARTERS = [
  'What is the speed of light in vacuum?',
  'Chemical formula of Plaster of Paris?',
  'Who discovered the electron?',
  'Unit of magnetic flux density in SI?',
  'What is Avogadro\'s number constant?',
];

export const InputArea: React.FC<InputAreaProps> = ({
  onSend,
  isLoading,
  selectedSubject = 'General',
  isQuickFire,
  onToggleQuickFire,
}) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isFixingSpeech, setIsFixingSpeech] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [fixNotification, setFixNotification] = useState<{
    original: string;
    corrected: string;
    changes: string[];
  } | null>(null);

  const rawTranscriptRef = useRef('');
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Process raw voice transcript through Gemini AI Speech Fixer
  const fixSpeechWithGemini = async (transcriptToFix: string) => {
    if (!transcriptToFix.trim() || transcriptToFix.trim().length < 3) return;

    setIsFixingSpeech(true);
    setSpeechError(null);

    try {
      const response = await fetch('/api/fix-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawTranscript: transcriptToFix,
          subject: selectedSubject,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const cleaned = data.correctedText || transcriptToFix;
        setText(cleaned);

        if (data.changesMade && data.changesMade.length > 0) {
          setFixNotification({
            original: transcriptToFix,
            corrected: cleaned,
            changes: data.changesMade,
          });
          setTimeout(() => setFixNotification(null), 8000);
        }
      }
    } catch (err) {
      console.warn('Speech auto-fix error:', err);
    } finally {
      setIsFixingSpeech(false);
    }
  };

  const handleToggleVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      setSpeechError('Voice input is not supported in this browser. Please use Chrome/Edge.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    if (isListening) {
      // Stop recording and trigger AI speech repair
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      if (rawTranscriptRef.current) {
        fixSpeechWithGemini(rawTranscriptRef.current);
      }
    } else {
      setSpeechError(null);
      setFixNotification(null);
      rawTranscriptRef.current = '';

      const recognizer = createSpeechRecognizer(
        (transcript) => {
          rawTranscriptRef.current = transcript;
          setText(transcript);
        },
        (err) => {
          setSpeechError(`Voice Error: ${err}`);
          setIsListening(false);
        },
        () => {
          setIsListening(false);
          if (rawTranscriptRef.current && !isFixingSpeech) {
            fixSpeechWithGemini(rawTranscriptRef.current);
          }
        }
      );

      if (recognizer) {
        recognitionRef.current = recognizer;
        try {
          recognizer.start();
          setIsListening(true);
        } catch (err) {
          console.error(err);
          setIsListening(false);
        }
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isLoading || isFixingSpeech) return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }

    onSend(text.trim());
    setText('');
    setFixNotification(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-none px-4 sm:px-8 pb-6 space-y-3">
      {/* Mode Switch & Starter Prompts Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
        {/* Quick-Fire Toggle Pill */}
        <button
          type="button"
          onClick={onToggleQuickFire}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs shrink-0 transition shadow-2xs border ${
            isQuickFire
              ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs animate-pulse'
              : 'bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-[#334155] hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400'
          }`}
          title={
            isQuickFire
              ? 'Quick-Fire Mode ACTIVE: Instant direct factual responses (bypasses heavy diagrams & practice)'
              : 'Switch to Quick-Fire Mode for blazing fast answers'
          }
        >
          <Zap className={`w-3.5 h-3.5 ${isQuickFire ? 'text-white fill-white' : 'text-amber-500'}`} />
          <span>{isQuickFire ? '⚡ Quick-Fire ON' : '⚡ Quick-Fire Mode'}</span>
        </button>

        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 font-semibold shrink-0 pl-1 border-l border-gray-300 dark:border-gray-700">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          {isQuickFire ? 'Quick facts:' : 'Try asking:'}
        </span>

        {(isQuickFire ? QUICK_FIRE_STARTERS : STARTER_PROMPTS).map((prompt, i) => (
          <button
            key={i}
            onClick={() => {
              setText(prompt);
              textareaRef.current?.focus();
            }}
            className={`text-[11px] px-3 py-1 rounded-full whitespace-nowrap transition shadow-2xs font-medium border ${
              isQuickFire
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 hover:bg-amber-100'
                : 'bg-white dark:bg-[#1e293b] border-gray-300 dark:border-[#334155] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-500'
            }`}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Mode Banner Indicator */}
      {isQuickFire && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 px-3.5 py-1.5 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <span className="flex items-center gap-1.5 font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500" />
            <span>Quick-Fire Mode: Instant answers with near-zero latency (skips diagrams & exam questions)</span>
          </span>
          <button
            type="button"
            onClick={onToggleQuickFire}
            className="text-[11px] font-bold underline hover:text-amber-950 dark:hover:text-white"
          >
            Switch to Deep Mode
          </button>
        </div>
      )}

      {/* Gemini Live Voice Mode Capture Card */}
      {isListening && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 text-white p-4 rounded-2xl border border-blue-500/40 shadow-xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center">
                <span className="w-4 h-4 rounded-full bg-blue-500 animate-ping absolute opacity-75" />
                <span className="w-3 h-3 rounded-full bg-blue-400 relative" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold tracking-wider text-blue-200 uppercase flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  Gemini Voice Capture Active
                </h4>
                <p className="text-[11px] text-blue-300">Speaking to Dr Emyush Shrestha...</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleVoice}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-1"
            >
              <MicOff className="w-3.5 h-3.5" />
              <span>Done & Auto-Correct</span>
            </button>
          </div>

          {/* Gemini Animated Audio Wave Visualizer */}
          <div className="flex items-center justify-center gap-1.5 py-2">
            <div className="w-1.5 h-6 bg-cyan-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <div className="w-1.5 h-10 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <div className="w-1.5 h-12 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
            <div className="w-1.5 h-8 bg-purple-400 rounded-full animate-bounce [animation-delay:450ms]" />
            <div className="w-1.5 h-11 bg-pink-400 rounded-full animate-bounce [animation-delay:200ms]" />
            <div className="w-1.5 h-7 bg-cyan-400 rounded-full animate-bounce [animation-delay:100ms]" />
          </div>

          {/* Live Transcript Display */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-3 min-h-[44px]">
            <p className="text-xs sm:text-sm text-cyan-100 font-medium italic">
              {text || 'Listening... Speak your question now (e.g. "What is geminal dihalide?")'}
            </p>
          </div>
        </div>
      )}

      {/* AI Speech Auto-Fixing Loading State */}
      {isFixingSpeech && (
        <div className="bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 px-4 py-3 rounded-xl text-blue-900 dark:text-blue-200 text-xs flex items-center justify-between shadow-2xs animate-pulse">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
            <div>
              <span className="font-bold block text-blue-900 dark:text-blue-100">✨ Gemini Auto-Correcting Speech...</span>
              <span className="text-[11px] text-blue-700 dark:text-blue-300">Fixing voice recognition typos, chemical notation, & math terms</span>
            </div>
          </div>
        </div>
      )}

      {/* Speech Auto-Fix Notification Badge */}
      {fixNotification && !isFixingSpeech && (
        <div className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs flex items-start justify-between gap-3 shadow-2xs animate-fadeIn">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-800 dark:text-emerald-300">✨ Voice Auto-Corrected & Cleaned:</span>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Fixes applied: {fixNotification.changes.join(', ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setFixNotification(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {speechError && (
        <div className="bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 px-3 py-1.5 rounded-lg text-rose-700 dark:text-rose-300 text-xs">
          {speechError}
        </div>
      )}

      {/* Main Form Box */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-[#f0f4f9] dark:bg-[#1e293b] rounded-2xl p-2.5 flex items-end gap-3 border border-transparent dark:border-[#334155] focus-within:border-blue-500/30 focus-within:ring-2 focus-within:ring-blue-500/20 transition shadow-2xs w-full"
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask GUIDE anything or tap the mic to dictate..."
          rows={2}
          className="w-full bg-transparent text-[#1f1f1f] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base sm:text-lg px-4 py-2.5 outline-none resize-none min-h-[58px] max-h-[180px] leading-relaxed"
          disabled={isLoading || isFixingSpeech}
        />

        <div className="flex items-center gap-2.5 p-1">
          {/* Gemini Voice Mic Input Button */}
          <button
            type="button"
            onClick={handleToggleVoice}
            disabled={isLoading || isFixingSpeech}
            className={`p-3 rounded-xl transition ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse shadow-md'
                : 'hover:bg-blue-100/80 dark:hover:bg-slate-700 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 text-blue-600 dark:text-blue-400'
            }`}
            title={isListening ? 'Stop & Auto-Correct Voice' : 'Start Gemini Voice Capture'}
          >
            {isListening ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!text.trim() || isLoading || isFixingSpeech}
            className="bg-blue-600 p-3 rounded-xl text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            title="Send Message"
          >
            {isLoading || isFixingSpeech ? (
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            ) : (
              <Send className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </form>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        GUIDE • Personal Academic & Exam Tutor for Dr Emyush Shrestha
      </p>
    </div>
  );
};


