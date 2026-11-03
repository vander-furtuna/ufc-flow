'use client'

import { FORUM_LIMITS, type SubjectSearchResult } from '@ufc-flow/contracts'
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from 'react'

import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'
import {
  activeMention,
  insertMention,
  matchRange,
} from '@/lib/forum/mention-editor'
import { useSubjectSearch } from '@/lib/forum/use-forum'
import { cn } from '@/lib/utils'
import { titleCase } from '@/utils/title-case'

const NATURE: Record<string, string> = {
  MANDATORY: 'Obrigatória',
  OPTATIVE: 'Optativa',
}

function Highlight({ name, query }: { name: string; query: string }) {
  const label = titleCase(name)
  const range = matchRange(label, query)
  if (!range) return <>{label}</>
  return (
    <>
      {label.slice(0, range[0])}
      <span className="text-orange-700 dark:text-orange-400">
        {label.slice(range[0], range[1])}
      </span>
      {label.slice(range[1])}
    </>
  )
}

function MentionList({
  id,
  results,
  active,
  query,
  curriculumLabel,
  onPick,
}: {
  id: string
  results: SubjectSearchResult[]
  active: number
  query: string
  curriculumLabel: string | null
  onPick: (result: SubjectSearchResult) => void
}) {
  const inGrade = results.filter((item) => item.inCurriculum)
  const others = results.filter((item) => !item.inCurriculum)
  const groups = [
    {
      label: curriculumLabel
        ? `Na sua grade · ${curriculumLabel}`
        : 'Na grade do curso',
      items: inGrade,
    },
    { label: 'Outros cursos', items: others },
  ].filter((group) => group.items.length > 0)

  return (
    <div
      id={id}
      className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-2xl border bg-background p-1.5 shadow-xl"
    >
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col">
          <span className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {group.label}
          </span>
          {group.items.map((item) => {
            const index = results.indexOf(item)
            const on = index === active
            return (
              <button
                key={item.code}
                type="button"
                // Não tira o foco do texto ao clicar
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onPick(item)}
                aria-current={on ? 'true' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left',
                  on ? 'bg-muted' : 'hover:bg-muted/60',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'h-8 w-1 shrink-0 rounded-full',
                    item.inCurriculum
                      ? item.nature === 'OPTATIVE'
                        ? 'bg-fuchsia-600'
                        : 'bg-orange-500'
                      : 'bg-slate-300 dark:bg-slate-600',
                  )}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    <Highlight name={item.name} query={query} />
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {[
                      item.code,
                      item.semester ? `${item.semester}º período` : null,
                      item.nature ? NATURE[item.nature] : null,
                      item.courseName ? titleCase(item.courseName) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                {on && (
                  <kbd className="hidden rounded border px-1.5 text-[11px] text-muted-foreground sm:inline">
                    Enter
                  </kbd>
                )}
              </button>
            )
          })}
        </div>
      ))}
      <p className="hidden gap-3 border-t px-2.5 pt-2 pb-1 text-[11px] text-muted-foreground sm:flex">
        <span>↑↓ navegar</span>
        <span>Enter escolher</span>
        <span>Esc fechar</span>
      </p>
    </div>
  )
}

// Editor do fórum (mockups Forum e Mobile-Forum-Escrever): digitar @ abre a
// busca de disciplinas e escolher grava o token @CÓDIGO no texto
export function Composer({
  courseSlug,
  curriculumLabel,
  placeholder,
  submitLabel,
  initial = '',
  focusOnOpen = false,
  onSubmit,
  onCancel,
  className,
}: {
  courseSlug: string
  curriculumLabel: string | null
  placeholder: string
  submitLabel: string
  initial?: string
  focusOnOpen?: boolean
  // true quando enviou (o editor esvazia)
  onSubmit: (content: string) => Promise<boolean>
  onCancel?: () => void
  className?: string
}) {
  const [text, setText] = useState(initial)
  const [caret, setCaret] = useState(initial.length)
  const [active, setActive] = useState(0)
  const [dismissed, setDismissed] = useState<number | null>(null)
  const [isSending, startSending] = useTransition()
  const area = useRef<HTMLTextAreaElement>(null)
  const listId = useId()
  const counterId = useId()

  // Foco ao abrir o editor em tela cheia (no celular)
  useEffect(() => {
    if (focusOnOpen) area.current?.focus()
  }, [focusOnOpen])

  const mention = activeMention(text, caret)
  const open = mention !== null && mention.start !== dismissed
  const query = useDebounce(open && mention.query ? mention.query : null, 150)
  const { data: results = [] } = useSubjectSearch(courseSlug, query)
  const shown = open && mention.query && results.length > 0 ? results : []
  const length = text.trim().length
  const tooLong = length > FORUM_LIMITS.content

  const sync = () => setCaret(area.current?.selectionStart ?? text.length)

  const pick = (result: SubjectSearchResult) => {
    if (!mention) return
    const next = insertMention(text, mention.start, caret, result.code)
    setText(next.text)
    setCaret(next.caret)
    setActive(0)
    requestAnimationFrame(() => {
      area.current?.focus()
      area.current?.setSelectionRange(next.caret, next.caret)
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (shown.length > 0) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        setActive((current) => (current + step + shown.length) % shown.length)
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        pick(shown[Math.min(active, shown.length - 1)]!)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setDismissed(mention!.start)
        return
      }
    }
    // Ctrl/Cmd + Enter publica
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (length === 0 || tooLong) return
    startSending(async () => {
      if (await onSubmit(text.trim())) {
        setText('')
        setCaret(0)
      }
    })
  }

  return (
    <form onSubmit={submit} className={cn('flex flex-col gap-3', className)}>
      <div className="relative">
        <label className="sr-only" htmlFor={`${listId}-text`}>
          {placeholder}
        </label>
        <textarea
          ref={area}
          id={`${listId}-text`}
          value={text}
          placeholder={placeholder}
          rows={3}
          aria-describedby={counterId}
          onChange={(event) => {
            setText(event.target.value)
            setCaret(event.target.selectionStart)
            setActive(0)
            setDismissed(null)
          }}
          onKeyDown={onKeyDown}
          onKeyUp={sync}
          onClick={sync}
          onSelect={sync}
          className="min-h-20 w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
        />
        {shown.length > 0 && mention && (
          <MentionList
            id={listId}
            results={shown}
            active={Math.min(active, shown.length - 1)}
            query={mention.query}
            curriculumLabel={curriculumLabel}
            onPick={pick}
          />
        )}
        <span aria-live="polite" className="sr-only">
          {shown.length > 0
            ? `${shown.length} disciplinas; use as setas e Enter para citar`
            : ''}
        </span>
      </div>
      <div className="flex items-center justify-end gap-3 border-t pt-3">
        <span
          id={counterId}
          className={cn(
            'mr-auto text-xs text-muted-foreground tabular-nums sm:mr-0',
            tooLong && 'font-semibold text-destructive',
          )}
        >
          {length}/{FORUM_LIMITS.content}
        </span>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          isLoading={isSending}
          disabled={length === 0 || tooLong}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
