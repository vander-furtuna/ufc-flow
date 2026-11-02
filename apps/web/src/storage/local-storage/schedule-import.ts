import { getFromLocalStorage, setToLocalStorage } from '.'

// Por conta: o diálogo de importação das agendas locais aparece até a pessoa
// importar ou dispensar
const key = (userId: string) => `schedule-import:${userId}`

export function getScheduleImportDone(userId: string): boolean {
  return getFromLocalStorage(key(userId)) !== ''
}

export function setScheduleImportDone(
  userId: string,
  outcome: 'imported' | 'dismissed',
): void {
  if (typeof window === 'undefined') return
  setToLocalStorage(key(userId), outcome)
}
