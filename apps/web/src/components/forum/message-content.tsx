import { splitMentions } from '@ufc-flow/academic-core'
import type { MessageMention } from '@ufc-flow/contracts'
import Link from 'next/link'

import { titleCase } from '@/utils/title-case'

// O texto com cada @CÓDIGO trocado por um chip que leva à disciplina, sem
// consultas extras (a API manda as menções resolvidas). Código que não
// existe no catálogo continua texto.
export function MessageContent({
  content,
  mentions,
  subjectHref,
  className,
}: {
  content: string
  mentions: MessageMention[]
  subjectHref: (code: string) => string | null
  className?: string
}) {
  const byCode = new Map(mentions.map((mention) => [mention.code, mention]))
  return (
    <p
      className={
        className ??
        'text-[15px] leading-relaxed wrap-break-word whitespace-pre-wrap'
      }
    >
      {splitMentions(content).map((segment, index) => {
        if ('text' in segment) return segment.text
        const mention = byCode.get(segment.code)
        if (!mention) return `@${segment.code}`
        const href = subjectHref(mention.code)
        const chip = `@${titleCase(mention.name)}`
        const className =
          'inline rounded-md border border-orange-200 bg-orange-50 px-1 font-medium text-orange-800 dark:border-orange-900 dark:bg-orange-950/60 dark:text-orange-200'
        return href ? (
          <Link
            key={index}
            href={href}
            title={mention.code}
            className={`${className} hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
          >
            {chip}
          </Link>
        ) : (
          <span key={index} title={mention.code} className={className}>
            {chip}
          </span>
        )
      })}
    </p>
  )
}
