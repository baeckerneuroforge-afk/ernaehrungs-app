import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

export function BlogArticle({ content }: Props) {
  return (
    <div className="prose prose-lg prose-gray max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold text-gray-900 mt-10 mb-4">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-3 pb-2 border-b border-gray-100">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed text-gray-600">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 pl-5 space-y-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 pl-5 space-y-2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-600 leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-800">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-gray-500">{children}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 my-4 text-gray-500 italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-6">
              <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-primary-bg px-4 py-2 text-left text-xs font-semibold text-primary border-b border-gray-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 border-b border-gray-100 text-gray-600">
              {children}
            </td>
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
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ""}
              className="rounded-xl my-6 w-full"
            />
          ),
          hr: () => <hr className="my-8 border-gray-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
