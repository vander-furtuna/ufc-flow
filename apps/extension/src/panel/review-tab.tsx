import { Download, Info, Send } from 'lucide-react'
import { useState } from 'react'

import { Button, LevelIcon } from '../components/ui'
import { FLOW_SYNC_ENABLED } from '../lib/config'
import { importJson } from '../lib/download'
import type { Extraction } from '../lib/extraction'
import { CoursePicker } from './course-picker'

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
            <Button disabled title="O envio chega com a API do Flow">
              <Send className="size-4" aria-hidden />
              Enviar ao UFC Flow
            </Button>
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
    </div>
  )
}
