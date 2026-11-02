import { Download, Info, Send } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button, LevelIcon } from '../components/ui'
import { FLOW_SYNC_ENABLED } from '../lib/config'
import { importJson } from '../lib/download'
import type { Extraction } from '../lib/extraction'
import type { SendResult as SendOutcome } from '../lib/flow-api'
import { nameMismatches } from '../lib/flow-store'
import { askBackground } from '../lib/messages'
import { CoursePicker } from './course-picker'
import { SendResult } from './send-result'

type Mismatch = ReturnType<typeof nameMismatches>[number]

const PREVIEW_LINES = 40

export function ReviewTab({
  extraction,
  onPickCourse,
  onDownload,
}: {
  extraction: Extraction
  onPickCourse: (sigaaId: string) => void
  onDownload: () => void
}) {
  const { review, data, course, catalog, exportable } = extraction
  const [picking, setPicking] = useState(false)
  const [copied, setCopied] = useState(false)
  const json = data ? importJson(data) : ''
  const kb = Math.max(1, Math.round(new Blob([json]).size / 1024))
  const showPicker = picking || course.course === null
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState<SendOutcome | null>(null)
  const [mismatches, setMismatches] = useState<Mismatch[]>([])

  // Nomes que divergem do catálogo do Flow viram pontos para revisar: avisa
  // antes de enviar
  const subjects = data?.subjects
  useEffect(() => {
    if (!FLOW_SYNC_ENABLED || !subjects) return
    let active = true
    askBackground({
      type: 'FLOW_SUBJECT_NAMES',
      codes: subjects.map((item) => item.code),
    })
      .then((names) => {
        if (active && names) {
          setMismatches(
            nameMismatches(subjects, new Map(Object.entries(names))),
          )
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [subjects])

  const send = async () => {
    if (!data) return
    setSending(true)
    try {
      setOutcome(await askBackground({ type: 'FLOW_SEND', payload: data }))
    } catch {
      setOutcome({
        ok: false,
        reason: 'UNAVAILABLE',
        message: 'Não foi possível falar com o Flow. Tente de novo.',
      })
    }
    setSending(false)
  }

  const copy = async () => {
    await navigator.clipboard.writeText(json)
    setCopied(true)
  }

  return (
    <div className="flex min-h-0 flex-1 gap-6 overflow-y-auto p-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="shrink-0">
          <h2 className="font-clash text-2xl font-semibold">
            Checagem da leitura
          </h2>
          <p className="text-muted-foreground text-sm">
            Tudo que a extensão entendeu da página, antes de sair do seu
            navegador.
          </p>
        </header>

        <ul className="border-border flex shrink-0 flex-col overflow-hidden rounded-2xl border">
          {review.map((item) => (
            <li
              key={item.id}
              className={
                item.level === 'ok'
                  ? 'border-border flex gap-3 border-b p-4 last:border-b-0'
                  : item.level === 'warning'
                    ? 'border-border flex gap-3 border-b bg-amber-50 p-4 last:border-b-0'
                    : 'border-border flex gap-3 border-b bg-red-50 p-4 last:border-b-0'
              }
            >
              <LevelIcon level={item.level} />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-muted-foreground text-sm">{item.detail}</p>
                {item.codes && (
                  <p className="font-mono text-xs">{item.codes.join(', ')}</p>
                )}
              </div>
            </li>
          ))}
        </ul>

        {mismatches.length > 0 && (
          <section className="flex shrink-0 gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <LevelIcon level="warning" />
            <div className="flex min-w-0 flex-col gap-2">
              <div>
                <p className="text-sm font-semibold">
                  {mismatches.length === 1
                    ? '1 nome diferente do catálogo do Flow'
                    : `${mismatches.length} nomes diferentes do catálogo do Flow`}
                </p>
                <p className="text-muted-foreground text-sm">
                  Viram pontos para revisar no editor: lá dá para manter o nome
                  do Flow ou usar o do SIGAA.
                </p>
              </div>
              <ul className="flex flex-col gap-1 text-sm">
                {mismatches.map((item) => (
                  <li key={item.code}>
                    <span className="font-mono">{item.code}</span> · SIGAA:{' '}
                    <em>{item.sigaaName}</em> · Flow: <em>{item.flowName}</em>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {data && (
          <section className="border-border shrink-0 overflow-hidden rounded-2xl border">
            <header className="flex items-center justify-between p-3 pl-4">
              <h3 className="text-sm font-semibold">
                JSON gerado · CurriculumImportV1 · {kb} KB
              </h3>
              <Button
                variant="outline"
                className="h-8 px-3 text-xs"
                onClick={copy}
              >
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </header>
            <pre className="max-h-72 overflow-auto bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
              {json.split('\n').slice(0, PREVIEW_LINES).join('\n')}
              {'\n…'}
            </pre>
          </section>
        )}
      </div>

      <aside className="border-border bg-card flex w-[380px] shrink-0 flex-col gap-4 self-start rounded-2xl border p-5">
        <h2 className="font-clash text-xl font-semibold">Curso e envio</h2>

        {showPicker ? (
          <CoursePicker
            catalog={catalog}
            candidates={course.candidates}
            selectedId={course.course?.sigaaId ?? null}
            onPick={(sigaaId) => {
              onPickCourse(sigaaId)
              setPicking(false)
            }}
          />
        ) : (
          <div className="border-border bg-background flex items-center justify-between gap-3 rounded-xl border p-3">
            <div className="text-sm">
              <p className="font-semibold">{course.course?.name}</p>
              <p className="text-muted-foreground">
                código SIGAA {course.course?.sigaaId}
              </p>
            </div>
            <Button
              variant="ghost"
              className="h-8 px-3 text-xs"
              onClick={() => setPicking(true)}
            >
              Trocar
            </Button>
          </div>
        )}

        {FLOW_SYNC_ENABLED ? (
          <>
            <p className="text-muted-foreground flex gap-2 text-xs">
              <Info className="size-4 shrink-0" aria-hidden />
              Nada vai ao ar agora. A publicação acontece no editor do Flow,
              depois da sua revisão.
            </p>
            <Button
              disabled={!exportable || sending}
              onClick={() => void send()}
            >
              <Send className="size-4" aria-hidden />
              {sending ? 'Enviando…' : 'Enviar ao UFC Flow'}
            </Button>
            {outcome && !outcome.ok && (
              <p role="alert" className="text-sm text-red-700">
                {outcome.message}
              </p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground flex gap-2 text-xs">
            <Info className="size-4 shrink-0" aria-hidden />
            Por enquanto a extensão só gera o arquivo. O envio direto ao Flow
            chega quando a API estiver no ar.
          </p>
        )}
        <Button
          variant={FLOW_SYNC_ENABLED ? 'outline' : 'primary'}
          disabled={!exportable}
          onClick={onDownload}
        >
          <Download className="size-4" aria-hidden />
          {FLOW_SYNC_ENABLED ? 'Só baixar o JSON' : 'Baixar o JSON'}
        </Button>
        {!exportable && (
          <p className="text-xs text-red-700">
            Resolva os itens em vermelho para liberar o JSON.
          </p>
        )}
      </aside>

      {outcome?.ok && (
        <SendResult
          view={outcome.view}
          onClose={() => setOutcome(null)}
          onDownload={() => {
            onDownload()
            setOutcome(null)
          }}
        />
      )}
    </div>
  )
}
