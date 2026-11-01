import { TriangleAlert, X } from 'lucide-react'

import { Button, Logo } from '../components/ui'
import type { ExtractionSummary } from '../lib/extraction'

// Botão flutuante na página do SIGAA (Ext-SIGAA-Launcher)
export function Launcher({
  summary,
  cardOpen,
  onToggleCard,
  onDismiss,
  onOpenPanel,
}: {
  summary: ExtractionSummary
  cardOpen: boolean
  onToggleCard: () => void
  onDismiss: () => void
  onOpenPanel: () => void
}) {
  return (
    <div className="text-foreground fixed right-7 bottom-7 z-[2147483645] flex flex-col items-end gap-3 font-sans">
      {cardOpen && (
        <section
          aria-label="Grade encontrada nesta página"
          className="border-border bg-background flex w-[360px] flex-col gap-3 rounded-2xl border p-4 shadow-xl"
        >
          <header className="flex gap-3">
            <Logo className="size-9" />
            <div className="flex-1">
              <h2 className="text-sm font-semibold">
                Grade encontrada nesta página
              </h2>
              <p className="text-muted-foreground text-sm">
                {summary.courseName} · EC {summary.code} · {summary.components}{' '}
                componentes · {summary.branches}{' '}
                {summary.branches === 1 ? 'vertente' : 'vertentes'}
              </p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dispensar"
              className="text-muted-foreground hover:bg-muted size-7 cursor-pointer rounded-lg"
            >
              <X className="m-auto size-4" aria-hidden />
            </button>
          </header>
          {summary.toReview > 0 && (
            <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <TriangleAlert className="size-4" aria-hidden />
              {summary.toReview}{' '}
              {summary.toReview === 1
                ? 'ponto para revisar'
                : 'pontos para revisar'}{' '}
              antes de enviar
            </p>
          )}
          <Button onClick={onOpenPanel}>Abrir painel</Button>
        </section>
      )}
      <button
        type="button"
        onClick={cardOpen ? onOpenPanel : onToggleCard}
        aria-label="Extrair grade com o UFC Flow"
        className="bg-primary text-primary-foreground flex h-12 cursor-pointer items-center gap-2.5 rounded-full py-1 pr-4 pl-1.5 text-sm font-semibold shadow-lg"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-white">
          <Logo className="size-7" />
        </span>
        Extrair grade
        {summary.toReview > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-orange-500 text-xs text-white">
            {summary.toReview}
          </span>
        )}
      </button>
    </div>
  )
}
