import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

interface MathMarkdownProps {
  content: string;
  className?: string;
}

export const MathMarkdown: React.FC<MathMarkdownProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Pre-process math delimiters and convert custom concept tags into HTML highlights
  let processed = content
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$ $1 $$$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$ $1 $$');

  // Convert shorthand tags to HTML <mark> elements
  // Blue highlights (Important concepts, key definitions, formulas)
  processed = processed
    .replace(/\[\[(?:KEY|BLUE|KEY CONCEPT|IMPORTANT):\s*([\s\S]*?)\]\]/gi, '<mark class="highlight-blue">$1</mark>')
    .replace(/<blue>([\s\S]*?)<\/blue>/gi, '<mark class="highlight-blue">$1</mark>')
    .replace(/<mark-blue>([\s\S]*?)<\/mark-blue>/gi, '<mark class="highlight-blue">$1</mark>')
    .replace(/==blue:\s*([\s\S]*?)==/gi, '<mark class="highlight-blue">$1</mark>');

  // Red highlights (Wrong concepts, common misconceptions, errors to avoid)
  processed = processed
    .replace(/\[\[(?:WRONG|RED|MISCONCEPTION|MISTAKE|ERROR):\s*([\s\S]*?)\]\]/gi, '<mark class="highlight-red">$1</mark>')
    .replace(/<red>([\s\S]*?)<\/red>/gi, '<mark class="highlight-red">$1</mark>')
    .replace(/<mark-red>([\s\S]*?)<\/mark-red>/gi, '<mark class="highlight-red">$1</mark>')
    .replace(/==red:\s*([\s\S]*?)==/gi, '<mark class="highlight-red">$1</mark>');

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          mark: ({ node, className, children, ...props }) => {
            if (className?.includes('highlight-blue')) {
              return (
                <mark className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-950/80 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 px-2 py-0.5 my-0.5 rounded-md font-semibold text-xs sm:text-sm shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 inline-block shrink-0" />
                  <span>{children}</span>
                </mark>
              );
            }
            if (className?.includes('highlight-red')) {
              return (
                <mark className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 px-2 py-0.5 my-0.5 rounded-md font-semibold text-xs sm:text-sm shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400 inline-block shrink-0" />
                  <span>{children}</span>
                </mark>
              );
            }
            return <mark className={className} {...props}>{children}</mark>;
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
};

