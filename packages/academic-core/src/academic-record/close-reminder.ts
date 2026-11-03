// Dias antes do fim do semestre vigente em que o aviso aparece
export const CLOSE_REMINDER_DAYS = 21

const DAY_MS = 24 * 60 * 60 * 1000

// Datas ISO (AAAA-MM-DD) comparadas em UTC, sem fuso
const dayNumber = (isoDate: string) =>
  Date.parse(`${isoDate}T00:00:00Z`) / DAY_MS

type CloseReminderInput = {
  // CURSANDO do semestre vigente
  inProgressCount: number
  // CURSANDO de semestres que já passaram
  staleCount: number
  // Fim do semestre vigente; nulo quando nenhum está marcado
  termEndsAt: string | null
  today: string
}

// O aluno é lembrado de fechar a situação a partir de 21 dias antes do fim do
// semestre vigente, e sempre que houver CURSANDO de semestres passados
export function isCloseReminderDue({
  inProgressCount,
  staleCount,
  termEndsAt,
  today,
}: CloseReminderInput): boolean {
  if (staleCount > 0) return true
  if (inProgressCount === 0 || termEndsAt === null) return false
  return dayNumber(termEndsAt) - dayNumber(today) <= CLOSE_REMINDER_DAYS
}
