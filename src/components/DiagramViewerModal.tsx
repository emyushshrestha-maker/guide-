import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Copy,
  Check,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Move,
  Search,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import { Diagram } from '../types';

interface DiagramViewerModalProps {
  diagram: Diagram | null;
  onClose: () => void;
}

export const DiagramViewerModal: React.FC<DiagramViewerModalProps> = ({
  diagram,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [bgDark, setBgDark] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset zoom and pan when diagram opens
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setImageLoadError(false);
  }, [diagram]);

  if (!diagram) return null;

  const hasRealImage = Boolean(diagram.imageUrl) && !imageLoadError;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.3, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.3, 0.4));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev + 0.15, 4));
    } else {
      setZoom((prev) => Math.max(prev - 0.15, 0.4));
    }
  };

  // Pan / Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCopy = () => {
    if (diagram.svg) {
      navigator.clipboard.writeText(diagram.svg);
    } else if (diagram.imageUrl) {
      navigator.clipboard.writeText(diagram.imageUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (hasRealImage && diagram.imageUrl) {
      // Download or open image in new tab
      const a = document.createElement('a');
      a.href = diagram.imageUrl;
      a.target = '_blank';
      a.download = `${diagram.title.toLowerCase().replace(/\s+/g, '-')}-picture`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (diagram.svg) {
      const blob = new Blob([diagram.svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${diagram.title.toLowerCase().replace(/\s+/g, '-')}-diagram.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsNativeFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsNativeFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex flex-col ${
        bgDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
      } transition-colors duration-200 overflow-hidden font-sans`}
    >
      {/* Top Fullscreen Header Controls */}
      <div className={`flex items-center justify-between px-4 sm:px-6 py-3 border-b ${
        bgDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      } backdrop-blur-md z-20 shrink-0`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-2">
              {diagram.title}
            </h2>
            <p className={`text-[11px] ${bgDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Full-Screen High-Resolution Diagram Inspector • Scroll wheel to Zoom, Drag to Pan
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2">
          {/* Google Images Direct Search Link */}
          {diagram.googleSearchUrl && (
            <a
              href={diagram.googleSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 transition flex items-center gap-1.5"
              title="Search related pictures on Google Images"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Google Images</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}

          {/* Side Panel Toggle */}
          <button
            onClick={() => setShowSidePanel(!showSidePanel)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 ${
              showSidePanel
                ? 'bg-blue-600 text-white border-blue-500'
                : bgDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Toggle Details & Key Concepts Panel"
          >
            {showSidePanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            <span className="hidden md:inline">{showSidePanel ? 'Hide Info' : 'Details'}</span>
          </button>

          {/* Light/Dark Canvas Theme */}
          <button
            onClick={() => setBgDark(!bgDark)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              bgDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Toggle Stage Background"
          >
            {bgDark ? 'Light' : 'Dark'}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleNativeFullscreen}
            className={`p-2 rounded-lg border transition ${
              bgDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Toggle Browser Fullscreen"
          >
            {isNativeFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Copy SVG / URL */}
          <button
            onClick={handleCopy}
            className={`p-2 rounded-lg border transition flex items-center gap-1.5 text-xs font-semibold ${
              bgDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Copy Diagram Content"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden lg:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 text-xs font-bold shadow-sm"
            title="Download Diagram"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Close Window */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white transition"
            title="Exit Fullscreen Viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Body Layout */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Main Render Stage - 100% Screen Space */}
        <div
          className={`flex-1 relative w-full h-full overflow-hidden flex items-center justify-center select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Floating Zoom & Navigation Overlay Controls */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1.5 shadow-xl backdrop-blur-md text-white">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-200 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="px-2.5 text-xs font-mono font-bold text-cyan-400 min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-200 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetZoom}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white border-l border-slate-700/80 ml-1 transition"
              title="Reset Zoom & Pan"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] text-slate-400 backdrop-blur-xs pointer-events-none">
            <Move className="w-3.5 h-3.5 text-blue-400" />
            <span>Click & Drag to pan • Scroll wheel to zoom</span>
          </div>

          {/* Canvas Box - Supports both Picture Image and SVG */}
          <div
            className="w-full h-full flex items-center justify-center p-4 transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            {hasRealImage ? (
              <img
                src={diagram.imageUrl}
                alt={diagram.title}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl pointer-events-none"
                onError={() => setImageLoadError(true)}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:object-contain [&_svg]:block pointer-events-none"
                dangerouslySetInnerHTML={{ __html: diagram.svg || '' }}
              />
            )}
          </div>
        </div>

        {/* Collapsible Info Drawer Side Panel */}
        {showSidePanel && (
          <aside className={`w-80 sm:w-96 border-l shrink-0 flex flex-col p-6 overflow-y-auto ${
            bgDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          } shadow-2xl z-20 animate-fadeIn`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/50 mb-5">
              <h3 className="text-xs uppercase tracking-wider text-blue-400 font-bold flex items-center gap-2">
                <Info className="w-4 h-4" />
                Diagram Details
              </h3>
              <button
                onClick={() => setShowSidePanel(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              {diagram.googleSearchUrl && (
                <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                    <Search className="w-4 h-4" />
                    <span>Browse High-Res on Google Images</span>
                  </div>
                  <p className="text-[11px] text-gray-300">
                    Find full textbook illustrations, photographic plates, and university diagrams.
                  </p>
                  <a
                    href={diagram.googleSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 font-bold underline"
                  >
                    Open Google Images Search <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Description</h4>
                <p className={`text-xs leading-relaxed p-4 rounded-xl border ${
                  bgDark ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  {diagram.description}
                </p>
              </div>

              {diagram.keyPoints && diagram.keyPoints.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-emerald-400 mb-3">
                    Key Visual Features & Labels
                  </h4>
                  <ul className="space-y-2">
                    {diagram.keyPoints.map((point, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-2.5 text-xs p-3 rounded-xl border ${
                          bgDark
                            ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">
                          {i + 1}
                        </span>
                        <span className="mt-0.5 leading-snug">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-auto pt-6 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-blue-400" />
                {hasRealImage ? 'Scientific Picture' : 'Schematic'}
              </span>
              <span className="text-blue-400 font-bold">GUIDE</span>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};


