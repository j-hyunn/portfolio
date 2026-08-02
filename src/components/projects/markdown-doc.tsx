import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link } from 'react-router-dom'
import { Mermaid } from '@/components/projects/mermaid'

/** ```mermaid 코드블록이면 다이어그램 소스를 돌려준다. */
function mermaidSource(className: unknown, children: unknown): string | null {
  if (typeof className !== 'string' || !className.includes('language-mermaid')) return null
  return String(children).replace(/\n$/, '')
}

export function MarkdownDoc({ title, source }: { title: string; source: string }) {
  return (
    <article>
      <p className="flex items-center gap-2.5 text-xs font-medium tracking-wider text-blue-600 uppercase">
        <span className="h-px w-5 bg-blue-400" />
        산출물
      </p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">{title}</h1>

      <div
        className="prose prose-neutral mt-8 max-w-none
          prose-headings:font-semibold prose-headings:tracking-tight
          prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base
          prose-a:text-blue-700 prose-a:no-underline hover:prose-a:underline
          prose-code:before:content-none prose-code:after:content-none
          prose-blockquote:border-l-blue-300 prose-blockquote:not-italic
          prose-table:text-sm prose-th:whitespace-nowrap
          prose-pre:text-sm
          [&_:not(pre)>code]:bg-secondary [&_:not(pre)>code]:rounded
          [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5
          [&_:not(pre)>code]:font-normal"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) =>
              href?.startsWith('/') ? (
                <Link to={href}>{children}</Link>
              ) : (
                <a href={href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              ),
            table: ({ children }) => (
              <div className="overflow-x-auto">
                <table>{children}</table>
              </div>
            ),
            // mermaid 블록은 <pre> 대신 다이어그램으로 렌더한다.
            pre: ({ children, ...props }) => {
              const child = Array.isArray(children) ? children[0] : children
              const code =
                child && typeof child === 'object' && 'props' in child
                  ? mermaidSource(
                      (child.props as { className?: unknown }).className,
                      (child.props as { children?: unknown }).children,
                    )
                  : null
              return code ? <Mermaid code={code} /> : <pre {...props}>{children}</pre>
            },
          }}
        >
          {source}
        </ReactMarkdown>
      </div>
    </article>
  )
}
