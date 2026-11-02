const LOWER = new Set([
  'a',
  'as',
  'da',
  'das',
  'de',
  'do',
  'dos',
  'e',
  'em',
  'o',
  'os',
])

// O SIGAA escreve em maiúsculas ("MICROPROCESSADORES")
export function titleCase(text: string): string {
  if (text !== text.toUpperCase()) return text
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) =>
      index > 0 && LOWER.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')
}
