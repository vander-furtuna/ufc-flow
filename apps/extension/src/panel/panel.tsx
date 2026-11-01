import { Download, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button, Chip, Logo, Tabs } from '../components/ui'
import { FLOW_SYNC_ENABLED } from '../lib/config'
import type { Extraction } from '../lib/extraction'
import { BranchesTab } from './branches-tab'
import { GridTab } from './grid-tab'
import { ReviewTab } from './review-tab'
import { RulesTab } from './rules-tab'

type Tab = 'grid' | 'branches' | 'rules' | 'review'

// Painel sobre a página do SIGAA com a grade extraída (Ext-Painel e
// Ext-Painel-Validacao)
export function Panel({
  extraction,
  onClose,
  onPickCourse,
  onDownload,
  initialTab = 'grid',
}: {
  extraction: Extraction
  onClose: () => void
  onPickCourse: (sigaaId: string) => void
  onDownload: () => void
  initialTab?: Tab
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const dialog = useRef<HTMLDialogElement>(null)
  const { data, summary, exportable } = extraction

  useEffect(() => {
    dialog.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const branches = data?.branches ?? []
  const subjects = data?.subjects ?? []

  return (
    <div className="text-foreground fixed inset-0 z-[2147483646] flex bg-slate-950/60 p-6 font-sans">
      <dialog
        open
        ref={dialog}
        aria-modal="true"
        aria-label={`Grade de ${summary.courseName}`}
        tabIndex={-1}
        className="bg-background text-foreground static m-0 flex h-auto max-h-none min-h-0 w-auto max-w-none flex-1 flex-col overflow-hidden rounded-3xl border-0 p-0 shadow-2xl outline-none"
      >
        <header className="border-border flex flex-wrap items-center gap-4 border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="flex flex-col gap-1">
              <h1 className="font-clash text-xl font-semibold">
                {summary.courseName}
              </h1>
              <div className="flex flex-wrap gap-1.5">
                <Chip>EC {summary.code}</Chip>
                <Chip>{summary.city}</Chip>
                {summary.sigaaId && <Chip mono>SIGAA {summary.sigaaId}</Chip>}
              </div>
            </div>
          </div>

          <Tabs
            label="Seções da grade"
            active={tab}
            onChange={setTab}
            items={[
              { id: 'grid', label: 'Grade' },
              { id: 'branches', label: `Vertentes · ${branches.length}` },
              { id: 'rules', label: 'Regras da EC' },
              {
                id: 'review',
                label: (
                  <>
                    Revisar
                    {summary.toReview > 0 && (
                      <span className="rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">
                        {summary.toReview}
                      </span>
                    )}
                  </>
                ),
              },
            ]}
          />

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              disabled={!exportable}
              onClick={onDownload}
              title={exportable ? undefined : 'Resolva os itens da aba Revisar'}
            >
              <Download className="size-4" aria-hidden />
              Baixar JSON
            </Button>
            {FLOW_SYNC_ENABLED && (
              <Button onClick={() => setTab('review')}>
                <Send className="size-4" aria-hidden />
                Enviar ao UFC Flow
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-10 px-0"
              onClick={onClose}
              aria-label="Fechar painel"
            >
              <X size={20} className="shrink-0" aria-hidden />
            </Button>
          </div>
        </header>

        <div role="tabpanel" className="flex min-h-0 flex-1 flex-col">
          {tab === 'grid' && (
            <GridTab subjects={subjects} branches={branches} />
          )}
          {tab === 'branches' && (
            <BranchesTab branches={branches} subjects={subjects} />
          )}
          {tab === 'rules' && data && <RulesTab curriculum={data.curriculum} />}
          {tab === 'review' && (
            <ReviewTab
              extraction={extraction}
              onPickCourse={onPickCourse}
              onDownload={onDownload}
            />
          )}
        </div>
      </dialog>
    </div>
  )
}
