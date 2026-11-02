'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { useCourse } from '@/contexts/course'
import { useSchedule } from '@/contexts/schedule'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useSession } from '@/lib/auth/use-session'
import { getAllSchedules } from '@/lib/indexeddb'
import {
  findImportCandidates,
  type ImportCandidate,
} from '@/lib/planning/import-candidates'
import {
  importSchedulesAction,
  previewImportAction,
  type ImportPreview,
} from '@/lib/planning/schedule-actions'
import {
  normalizeLocalSchedule,
  toImportEntry,
} from '@/lib/planning/schedule-mapper'
import {
  getScheduleImportDone,
  setScheduleImportDone,
} from '@/storage/local-storage/schedule-import'

import {
  ScheduleImportDialog,
  type ImportChoice,
} from './schedule-import-dialog'

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`

// No primeiro login com agendas neste navegador, oferece levá-las para a
// conta. Aparece até a pessoa importar ou dispensar (por conta).
export function ScheduleImportPrompt() {
  const { data: user } = useSession()
  const { courses } = useCourse()
  const { reloadSchedules } = useSchedule()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [found, setFound] = useState<{
    candidates: ImportCandidate[]
    preview: ImportPreview
  } | null>(null)
  const [open, setOpen] = useState(false)
  const [isImporting, startImport] = useTransition()
  const userId = user?.id ?? null

  useEffect(() => {
    if (!userId || courses.length === 0 || getScheduleImportDone(userId)) {
      return
    }
    let cancelled = false
    void (async () => {
      const local = (await getAllSchedules()).map(normalizeLocalSchedule)
      const candidates = findImportCandidates(local, courses)
      if (candidates.length === 0 || cancelled) return
      const preview = await previewImportAction(
        candidates.flatMap((candidate) =>
          candidate.options.map((option) => ({
            term: candidate.term,
            courseSlug: option.courseSlug,
          })),
        ),
      )
      // Só abre se ao menos uma agenda pode entrar (semestre coletado)
      const importable = candidates.some((candidate) =>
        candidate.options.some(
          (option) =>
            preview[`${candidate.term}|${option.courseSlug}`]?.available,
        ),
      )
      if (cancelled || !importable) return
      setFound({ candidates, preview })
      setOpen(true)
    })().catch((error: unknown) => {
      console.error('Falha ao procurar agendas locais:', error)
    })
    return () => {
      cancelled = true
    }
  }, [userId, courses])

  if (!found || !userId) return null

  const dismiss = () => {
    setScheduleImportDone(userId, 'dismissed')
    setOpen(false)
  }

  const importChosen = (choices: ImportChoice[]) =>
    startImport(async () => {
      const result = await importSchedulesAction({
        schedules: choices.map(({ candidate, option }) =>
          toImportEntry(candidate.schedule, option),
        ),
      })
      if (!result.ok) {
        toast.error('Não foi possível importar as agendas', {
          description: result.problem.detail,
        })
        return
      }
      const results = result.data.results
      const imported = results.filter((item) => item.status !== 'FAILED')
      const failed = results.length - imported.length
      const left = imported.reduce(
        (sum, item) => sum + item.notFound.length + item.skipped.length,
        0,
      )
      setScheduleImportDone(userId, 'imported')
      setOpen(false)
      reloadSchedules()
      toast.success(
        `${plural(imported.length, 'agenda importada', 'agendas importadas')} para a sua conta`,
        {
          description:
            [
              left > 0
                ? `${plural(left, 'turma ficou', 'turmas ficaram')} de fora.`
                : '',
              failed > 0
                ? `${plural(failed, 'agenda não pôde', 'agendas não puderam')} ser importada${failed === 1 ? '' : 's'}.`
                : '',
            ]
              .filter(Boolean)
              .join(' ') || undefined,
        },
      )
    })

  return (
    <ScheduleImportDialog
      key={found.candidates.map((item) => item.schedule.id).join()}
      open={open}
      candidates={found.candidates}
      preview={found.preview}
      isMobile={isMobile}
      isImporting={isImporting}
      onImport={importChosen}
      onDismiss={dismiss}
    />
  )
}
