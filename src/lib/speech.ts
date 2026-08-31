// Web Speech API Helpers for Instant High-Quality Natural Voice & Speech Input

export interface SpeechRecognitionResultEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export function createSpeechRecognizer(
  onResult: (transcript: string, isFinal: boolean) => void,
  onError: (err: string) => void,
  onEnd: () => void
) {
  if (!isSpeechRecognitionSupported()) {
    onError('Speech recognition is not supported in this browser.');
    return null;
  }

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event: SpeechRecognitionResultEvent) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = 0; i < Object.keys(event.results).length; i++) {
      const result = (event.results as any)[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    const transcript = finalTranscript || interimTranscript;
    onResult(transcript, !!finalTranscript);
  };

  recognition.onerror = (event: any) => {
    console.error('Speech recognition error:', event);
    onError(event.error || 'Speech input error');
  };

  recognition.onend = () => {
    onEnd();
  };

  return recognition;
}

// Global active audio & speech cancellation tracker
let activeUtterance: SpeechSynthesisUtterance | null = null;
let currentEndCallback: (() => void) | null = null;
let currentAudioElement: HTMLAudioElement | null = null;

// Stop ALL speech immediately and guarantee no lingering audio or dual voices
export function stopSpeaking() {
  if (currentEndCallback) {
    const cb = currentEndCallback;
    currentEndCallback = null;
    try { cb(); } catch (e) {}
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }

  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
      currentAudioElement.src = '';
    } catch (e) {}
    currentAudioElement = null;
  }

  activeUtterance = null;
}

// Pick the highest-quality, most natural, human-like voice available
function getBestNaturalVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Priority ranking for natural, premium human sounding voices
  const preferredNames = [
    /google us english/i,
    /google uk english female/i,
    /microsoft jenny/i,
    /microsoft guy/i,
    /microsoft aria/i,
    /natural/i,
    /samantha/i,
    /karen/i,
    /daniel/i,
    /serena/i,
    /en-us/i,
    /en-gb/i,
    /english/i,
  ];

  for (const pattern of preferredNames) {
    const match = voices.find((v) => pattern.test(v.name) || pattern.test(v.voiceURI));
    if (match) return match;
  }

  // Fallback to any English voice
  const englishVoice = voices.find((v) => v.lang.startsWith('en'));
  return englishVoice || voices[0] || null;
}

// Pre-load voices on startup so there's 0 delay when user clicks speak
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
}

// Format mathematical and scientific text into fluent, natural spoken English
function prepareTextForSpeech(text: string): string {
  if (!text) return '';

  return text
    // Strip code blocks
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    // Strip custom UI tags
    .replace(/\[\[KEY:\s*(.*?)]]/g, '$1')
    .replace(/\[\[WRONG:\s*(.*?)]]/g, '$1')
    // Convert common LaTeX math & chemical symbols to clear speech
    .replace(/\\rightarrow/g, ' yields ')
    .replace(/\\leftarrow/g, ' from ')
    .replace(/\\times/g, ' times ')
    .replace(/\\pm/g, ' plus or minus ')
    .replace(/\\approx/g, ' is approximately equal to ')
    .replace(/\\neq/g, ' does not equal ')
    .replace(/\\le/g, ' is less than or equal to ')
    .replace(/\\ge/g, ' is greater than or equal to ')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
    .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
    .replace(/\\(text|mathbf|mathrm|ce)\{([^}]+)\}/g, '$2')
    .replace(/\$(.*?)\$/g, '$1')
    // Remove markdown symbols
    .replace(/[*#`_~]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    // Clean multiple whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Instant Natural Voice Reader (0ms latency, human cadence, zero dual-voice collision)
 */
export function speakText(text: string, onEnd?: () => void): void {
  // 1. Immediately cancel any running synthesis/audio
  stopSpeaking();

  if (!text || !text.trim()) {
    onEnd?.();
    return;
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }

  const cleanText = prepareTextForSpeech(text);
  if (!cleanText) {
    onEnd?.();
    return;
  }

  currentEndCallback = onEnd || null;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.02; // Optimal natural cadence
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  utterance.lang = 'en-US';

  const bestVoice = getBestNaturalVoice();
  if (bestVoice) {
    utterance.voice = bestVoice;
  }

  const handleFinish = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
      if (currentEndCallback) {
        const cb = currentEndCallback;
        currentEndCallback = null;
        cb();
      }
    }
  };

  utterance.onend = handleFinish;
  utterance.onerror = (err) => {
    // If user cancelled, don't treat as fatal error
    handleFinish();
  };

  activeUtterance = utterance;

  // Speak instantly without any network roundtrip
  window.speechSynthesis.speak(utterance);
}
