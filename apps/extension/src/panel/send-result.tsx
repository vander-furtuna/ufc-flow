import type { CurriculumImportView } from '@ufc-flow/contracts'
import { Check, Clock, ExternalLink, GitCompare } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

import { Button, cn } from '../components/ui'
import { editorUrl, importUrl } from '../lib/config'

function Modal({
  icon,
  iconClass,
  title,
  children,
  actions,
}: {
  icon: ReactNode
  iconClass: string
  title: string
  children: ReactNode
  actions: ReactNode
}) {
  const box = useRef<HTMLDialogElement>(null)
  useEffect(() => box.current?.focus(), [])
  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/60 p-6">
      <dialog
        open
        ref={box}
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="bg-background text-foreground static m-0 flex w-full max-w-[496px] flex-col items-center gap-4 rounded-3xl p-7 text-center shadow-2xl outline-none"
      >
        <span
          className={cn(
            'flex size-16 items-center justify-center rounded-full',
            iconClass,
          )}
        >
          {icon}
        </span>
        <h2 className="font-clash text-2xl font-semibold">{title}</h2>
        {children}
        <div className="grid w-full grid-cols-2 gap-3">{actions}</div>
      </dialog>
    </div>
  )
}

const open = (url: string) => window.open(url, '_blank', 'noopener')

// Modais Ext-Envio-Concluido e Ext-Envio-Pendente, mais o de reimportação
// (a EC já existe e o diff espera ser aplicado no editor)
export function SendResult({
  view,
  onClose,
  onDownload,
}: {
  view: CurriculumImportView
  onClose: () => void
  onDownload: () => void
}) {
  if (view.pendingReason === 'COURSE_MISSING') {
    return (
      <Modal
        icon={<Clock className="size-7" aria-hidden />}
        iconClass="bg-amber-100 text-amber-700"
        title="Recebido, falta o curso"
        actions={
          <>
            <Button variant="outline" onClick={onDownload}>
              Baixar o JSON também
            </Button>
            <Button onClick={onClose}>Entendi</Button>
          </>
        }
      >
        <p className="text-muted-foreground text-sm">
          {view.course.name} (código SIGAA{' '}
          <span className="font-mono">{view.course.sigaaId}</span>) ainda não
          existe no Flow. A grade ficou guardada e aparece para os
          administradores em Importações. Quando o curso for criado, o rascunho
          aparece sozinho.
        </p>
        <p className="bg-card border-border flex w-full items-center gap-2 rounded-xl border p-3 text-left text-sm">
          <span aria-hidden className="size-2 rounded-full bg-amber-500" />
          Status em <strong>Envios recentes</strong> no popup
        </p>
      </Modal>
    )
  }

  if (view.pendingReason === 'DIFF_REVIEW') {
    return (
      <Modal
        icon={<GitCompare className="size-7" aria-hidden />}
        iconClass="bg-cyan-100 text-cyan-800"
        title="Recebido, confira as diferenças"
        actions={
          <>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button onClick={() => open(importUrl(view.id))}>
              Ver diferenças
              <ExternalLink className="size-4" aria-hidden />
            </Button>
          </>
        }
      >
        <p className="text-muted-foreground text-sm">
          A EC {view.curriculum.code} de {view.course.name} já existe no Flow.
          As mudanças ficam esperando alguém conferir e aplicar no editor.
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      icon={<Check className="size-7" aria-hidden />}
      iconClass="bg-green-100 text-green-700"
      title="Rascunho criado no Flow"
      actions={
        <>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button
            disabled={view.curriculum.id === null}
            onClick={() => open(editorUrl(view.curriculum.id as string))}
          >
            Abrir no editor
            <ExternalLink className="size-4" aria-hidden />
          </Button>
        </>
      }
    >
      <p className="text-muted-foreground text-sm">
        {view.course.name} · EC {view.curriculum.code} com {view.subjectCount}{' '}
        componentes. Ele aparece em Administração › Estruturas, pronto para
        revisar e publicar.
      </p>
      <dl className="bg-card border-border flex w-full flex-col gap-2 rounded-xl border p-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            Pontos para revisar no editor
          </dt>
          <dd
            className={cn(
              'font-semibold',
              view.reviewPointCount > 0 && 'text-orange-700',
            )}
          >
            {view.reviewPointCount}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Cópia do JSON enviada</dt>
          <dd className="font-semibold">guardada no Flow</dd>
        </div>
      </dl>
    </Modal>
  )
}
