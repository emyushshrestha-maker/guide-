import React, { useState, useEffect } from 'react';
import {
  Download,
  X,
  Smartphone,
  Monitor,
  Apple,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Laptop,
  Share2,
  PlusSquare,
  Globe,
  Copy,
  Check
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onPromptTriggered: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onPromptTriggered,
}) => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Check if running as standalone installed PWA
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
    }

    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) {
      setIsIOS(true);
    } else if (/Android/i.test(ua)) {
      setIsAndroid(true);
    } else {
      setIsDesktop(true);
    }
  }, []);

  if (!isOpen) return null;

  // Current active live application URL
  const activeAppUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      onPromptTriggered();
    }
  };

  const handleOpenNewTab = () => {
    window.open(activeAppUrl, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeAppUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadWindowsUrlShortcut = () => {
    const urlContent = `[InternetShortcut]
URL=${activeAppUrl}
IconIndex=0
[{000214A0-0000-0000-C000-00000000046}]
Prop3=19,2
`;

    const blob = new Blob([urlContent], { type: 'application/x-mswinurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GUIDE Academic Partner.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtmlLauncher = () => {
    const launcherHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GUIDE Academic Partner App</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 60px 20px; background: #f0f4f9; color: #1e293b; }
    .card { max-width: 480px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
    .btn { display: inline-block; padding: 16px 32px; background: #2563eb; color: white; font-weight: bold; font-size: 18px; border-radius: 12px; text-decoration: none; margin-top: 20px; }
  </style>
  <script>
    window.location.href = "${activeAppUrl}";
  </script>
</head>
<body>
  <div class="card">
    <h2 style="color: #2563eb; margin-top:0;">Opening GUIDE Academic Partner...</h2>
    <p>Connecting to your personal AI academic tutor...</p>
    <a href="${activeAppUrl}" class="btn">Launch GUIDE App</a>
  </div>
</body>
</html>`;

    const blob = new Blob([launcherHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GUIDE-Academic-Partner-Launcher.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-6 sm:p-7 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-700 font-black text-2xl shadow-lg">
              G
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200 bg-blue-800/60 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                Official Web App
              </span>
              <h3 className="text-2xl font-black tracking-tight mt-1">
                Install GUIDE on Windows & Mobile
              </h3>
            </div>
          </div>

          <p className="text-blue-100 text-sm leading-relaxed mt-2">
            Install <strong>GUIDE Academic Partner</strong> as a desktop application on your Windows PC, phone, or tablet.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Active Live App URL notice */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-950 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-blue-900">
                <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Active Live App Link</span>
              </div>
              <span className="text-[10px] bg-blue-200/80 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                Connected & Ready
              </span>
            </div>
            <p className="text-xs text-blue-800 leading-relaxed">
              Use this active URL to launch the app directly or install it into your browser.
            </p>
            <div className="bg-white px-3 py-2 rounded-lg border border-blue-200 text-[11px] font-mono text-gray-800 break-all select-all flex items-center justify-between gap-2">
              <span className="truncate">{activeAppUrl}</span>
              <button
                onClick={handleCopyLink}
                className="text-blue-700 hover:text-blue-900 font-sans font-bold text-xs shrink-0 underline"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* METHOD 1: Windows Browser Address Bar Install (Primary Recommended) */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl text-blue-950 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="bg-blue-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Method 1 (Recommended)
              </span>
              <span className="text-xs font-bold text-blue-700">Windows Chrome / Edge / Brave</span>
            </div>

            <h4 className="font-black text-base text-gray-900 leading-snug">
              Install Natively via Windows Chrome or Edge Address Bar
            </h4>

            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              Inside embedded preview frames, Windows blocks app installation. To install:
            </p>

            <ol className="list-decimal pl-4 space-y-2 text-xs sm:text-sm text-gray-800 font-medium">
              <li>
                Click <strong>"Open App in New Tab"</strong> below to open GUIDE in a clean Chrome window.
              </li>
              <li>
                In the new tab, click the <strong>3 Dots Menu (⋮)</strong> at the top-right of Chrome.
              </li>
              <li>
                Hover over <strong>"Cast, save and share"</strong> (or <strong>"Save and share"</strong> / <strong>"More tools"</strong>).
              </li>
              <li>
                Click <strong>"Install GUIDE Academic Partner..."</strong> (or <strong>"Create shortcut..."</strong> ➔ check <em>"Open as window"</em>).
              </li>
            </ol>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                onClick={handleOpenNewTab}
                className="w-full sm:w-auto flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open App in New Tab</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full sm:w-auto px-4 py-3 bg-white border border-blue-300 hover:bg-blue-100/50 text-blue-900 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-blue-600" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Prompt Banner if Browser Fires beforeinstallprompt */}
          {deferredPrompt && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-sm flex items-center gap-1.5 text-emerald-900">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Direct Browser Installation Available</span>
                </h4>
                <p className="text-xs text-emerald-800">Your current window supports direct 1-click app installation.</p>
              </div>
              <button
                onClick={handleNativeInstall}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shrink-0"
              >
                Install Now
              </button>
            </div>
          )}

          {/* METHOD 2: Windows Desktop Shortcuts (Immediate 1-Click Icons) */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="bg-gray-800 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Method 2
              </span>
              <span className="text-xs font-bold text-gray-500">Windows Desktop Icons</span>
            </div>

            <h4 className="font-bold text-sm text-gray-900">
              Download Windows Desktop Shortcut Icon
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Download a 1-click shortcut file directly to your Windows Desktop or Downloads folder. Double-clicking it opens GUIDE immediately:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleDownloadWindowsUrlShortcut}
                className="p-3 bg-white border border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl text-left transition space-y-1 group"
              >
                <div className="flex items-center justify-between font-bold text-xs text-gray-900 group-hover:text-blue-700">
                  <span>Windows .URL Shortcut</span>
                  <Download className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-[11px] text-gray-500">
                  Saves a native Windows Desktop Icon. Double-click to launch GUIDE.
                </p>
              </button>

              <button
                onClick={handleDownloadHtmlLauncher}
                className="p-3 bg-white border border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl text-left transition space-y-1 group"
              >
                <div className="flex items-center justify-between font-bold text-xs text-gray-900 group-hover:text-blue-700">
                  <span>Desktop .HTML Launcher</span>
                  <Download className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-[11px] text-gray-500">
                  Saves a desktop launcher page compatible with all Windows web browsers.
                </p>
              </button>
            </div>
          </div>

          {/* Permanent Link & Share in AI Studio Guide */}
          <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl space-y-2.5 text-xs text-amber-950">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>How to Get a Permanent 24/7 Link (Never Expires):</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              In Google AI Studio, click the <strong>"Share"</strong> button in the top-right toolbar. Once created, you will get a permanent public link that never goes offline or expires, even if you close your computer for weeks!
            </p>
          </div>

          {/* Mobile Devices Guide */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3 text-xs">
            <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>Mobile Phone Instructions (iOS & Android)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-600">
              <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-1">
                <div className="font-bold text-gray-900 flex items-center gap-1">
                  <Apple className="w-3.5 h-3.5 text-gray-800" />
                  <span>iPhone / iPad (Safari)</span>
                </div>
                <p className="text-[11px]">
                  Open in Safari ➔ Tap <strong>Share</strong> <Share2 className="w-3 h-3 inline text-blue-600" /> ➔ Tap <strong>"Add to Home Screen"</strong> <PlusSquare className="w-3 h-3 inline text-blue-600" />.
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-1">
                <div className="font-bold text-gray-900 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Android (Chrome)</span>
                </div>
                <p className="text-[11px]">
                  Open in Chrome ➔ Tap <strong>Menu (⋮)</strong> ➔ Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-100 p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>GUIDE App • Progressive Web Application</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
