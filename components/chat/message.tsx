"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ content, isStreaming }: ChatMessageProps) {
  if (!content && isStreaming) return null;

  return (
    <div className="prose prose-sm prose-gray max-w-none text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 pl-4 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 pl-4 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-gray-700">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-800">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-gray-500">{children}</em>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-primary-bg px-3 py-1.5 text-left text-xs font-semibold text-primary border-b border-gray-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-1.5 border-b border-gray-100 text-gray-600">
              {children}
            </td>
          ),
          h3: ({ children }) => (
            <h3 className="font-semibold text-gray-800 mt-3 mb-1">{children}</h3>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
