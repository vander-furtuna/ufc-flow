import Markdown from 'react-markdown'

// Lista restrita do corpo dos posts (D85): sem HTML cru e sem imagens (a
// galeria é à parte). O que sai da lista vira texto; os títulos ficam entre
// h2 e h3, abaixo do título do post.
const ALLOWED = [
  'h1',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'strong',
  'em',
  'a',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'blockquote',
  'code',
]

export function PostMarkdown({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-foreground/90 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm [&_h2]:font-clash [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
      <Markdown
        allowedElements={ALLOWED}
        unwrapDisallowed
        components={{
          h1: ({ children }) => <h2>{children}</h2>,
          h4: ({ children }) => <h3>{children}</h3>,
          h5: ({ children }) => <h3>{children}</h3>,
          h6: ({ children }) => <h3>{children}</h3>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </Markdown>
    </div>
  )
}
