import React, { useState } from 'react';
import { Maximize2, ExternalLink, Image as ImageIcon, Search } from 'lucide-react';
import { Diagram } from '../types';

interface DiagramCardProps {
  diagram: Diagram;
  index: number;
  onOpenModal: (diagram: Diagram) => void;
}

export const DiagramCard: React.FC<DiagramCardProps> = ({
  diagram,
  index,
  onOpenModal,
}) => {
  const [imageError, setImageError] = useState(false);

  const hasRealImage = Boolean(diagram.imageUrl) && !imageError;

  return (
    <div className="group relative bg-white dark:bg-[#1e293b] border border-[#e3e3e3] dark:border-[#334155] rounded-xl overflow-hidden shadow-2xs transition-all hover:border-blue-400 dark:hover:border-blue-500 flex flex-col">
      {/* Top Header Badge */}
      <div className="px-4 py-2.5 bg-[#f8f9fa] dark:bg-[#0f172a] border-b border-[#e3e3e3] dark:border-[#334155] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold flex items-center justify-center">
            #{index + 1}
          </span>
          <h4 className="text-sm font-bold text-[#1f1f1f] dark:text-[#f1f5f9] truncate max-w-[240px] sm:max-w-[280px]">
            {diagram.title}
          </h4>
        </div>
        
        <div className="flex items-center gap-1.5">
          {diagram.googleSearchUrl && (
            <a
              href={diagram.googleSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center gap-1 bg-white dark:bg-[#1e293b] hover:bg-gray-50 dark:hover:bg-slate-700 px-2 py-1 rounded-lg border border-gray-200 dark:border-[#334155] transition shadow-2xs"
              title="Search and browse authentic diagrams on Google Images"
              onClick={(e) => e.stopPropagation()}
            >
              <Search className="w-3 h-3 text-blue-500" />
              <span className="hidden sm:inline">Google Images</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          )}

          <button
            onClick={() => onOpenModal(diagram)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold flex items-center gap-1.5 bg-white dark:bg-[#1e293b] hover:bg-gray-50 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-[#334155] shadow-2xs"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Inspect</span>
          </button>
        </div>
      </div>

      {/* Picture / Diagram Preview Stage */}
      <div
        className="relative bg-gray-50/90 dark:bg-[#0b0f19] p-3 sm:p-4 flex items-center justify-center aspect-[4/3] overflow-hidden cursor-pointer group min-h-[220px]"
        onClick={() => onOpenModal(diagram)}
      >
        {hasRealImage ? (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={diagram.imageUrl}
              alt={diagram.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-103"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </div>
        ) : (
          <div
            className="w-full h-full flex justify-center items-center pointer-events-none transform transition-transform group-hover:scale-102 duration-200 [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:object-contain [&_svg]:block"
            dangerouslySetInnerHTML={{ __html: diagram.svg || '' }}
          />
        )}

        {/* Source Badge */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] text-gray-200 flex items-center gap-1 font-medium pointer-events-none">
          <ImageIcon className="w-3 h-3 text-blue-400" />
          <span>{hasRealImage ? (diagram.sourceLabel || 'Academic Picture') : 'Scientific Schematic'}</span>
        </div>

        {/* Hover Overlay Button */}
        <button
          className="absolute top-3 right-3 px-3.5 py-1.5 bg-white dark:bg-[#1e293b] shadow-sm rounded-full text-xs font-bold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#334155] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal(diagram);
          }}
        >
          <Maximize2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Full View</span>
        </button>
      </div>

      {/* Bottom Description */}
      <div className="p-4 bg-white dark:bg-[#1e293b] border-t border-[#e3e3e3] dark:border-[#334155] mt-auto space-y-2">
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-snug">
          {diagram.description}
        </p>

        {diagram.keyPoints && diagram.keyPoints.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {diagram.keyPoints.slice(0, 3).map((pt, i) => (
              <span
                key={i}
                className="text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#0f172a] px-2.5 py-1 rounded-md border border-gray-200 dark:border-[#334155] font-medium truncate max-w-[200px]"
              >
                • {pt}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

