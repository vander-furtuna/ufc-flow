export const dayToColIndex = (day: string): number => {
  const map: Record<string, number> = {
    SEG: 0,
    TER: 1,
    QUA: 2,
    QUI: 3,
    SEX: 4,
    SAB: 5,
    DOM: 6,
  }
  return map[day.toUpperCase()] ?? -1
}
