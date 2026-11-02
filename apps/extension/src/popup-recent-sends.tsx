import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from './components/ui'
import { editorUrl, importUrl } from './lib/config'
import {
  chromeValueStore,
  describeSend,
  type RecentSend,
  type SendTone,
} from './lib/flow-store'
import { askBackground } from './lib/messages'

// Ponto colorido mais texto na cor do tema: funciona no claro e no escuro
const DOTS: Record<SendTone, string> = {
  success: 'bg-green-500',
  waiting: 'bg-amber-500',
  muted: 'bg-slate-400',
}

const store = chromeValueStore<RecentSend[]>('ufc-flow:recent-sends')

// Envios recentes ao Flow, com a situação atualizada (curso criado, diff
// aplicado) ao abrir o popup
export function RecentSends() {
  const [sends, setSends] = useState<RecentSend[]>([])

  useEffect(() => {
    void store.get().then((list) => setSends(list ?? []))
    askBackground({ type: 'FLOW_REFRESH_SENDS' })
      .then(setSends)
      .catch(() => undefined)
  }, [])

  if (sends.length === 0) return null

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Envios recentes
      </h2>
      <ul className="flex flex-col gap-2">
        {sends.slice(0, 3).map((send) => {
          const { tone, label } = describeSend(send)
          const url =
            send.status === 'APPLIED' && send.curriculumId
              ? editorUrl(send.curriculumId)
              : importUrl(send.importId)
          return (
            <li key={send.importId}>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="border-border hover:bg-muted flex flex-col gap-1 rounded-xl border px-3 py-2.5 text-sm"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">
                    {send.courseName}
                  </span>
                  <ExternalLink
                    className="text-muted-foreground size-3.5 shrink-0"
                    aria-label="Abrir no Flow"
                  />
                </span>
                <span className="flex items-center gap-1.5 text-xs">
                  <span
                    aria-hidden
                    className={cn('size-2 shrink-0 rounded-full', DOTS[tone])}
                  />
                  <span className="font-medium">{label}</span>
                  <span className="text-muted-foreground">
                    · EC {send.code} ·{' '}
                    {new Date(send.sentAt).toLocaleDateString('pt-BR')}
                  </span>
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
