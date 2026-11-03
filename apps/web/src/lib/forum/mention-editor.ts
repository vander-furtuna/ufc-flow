// O @ que está sendo digitado: do @ até o cursor, só letras e dígitos, com
// o @ no começo ou depois de algo que não seja letra, dígito ou "_"
const TYPING = /(?:^|[^\p{L}\p{N}_])@([\p{L}\p{N}]*)$/u

export function activeMention(
  text: string,
  caret: number,
): { start: number; query: string } | null {
  const before = text.slice(0, caret)
  const match = TYPING.exec(before)
  if (!match) return null
  // O texto depois do cursor não pode continuar a palavra
  if (/^[\p{L}\p{N}]/u.test(text.slice(caret))) return null
  const query = match[1]!
  return { start: caret - query.length - 1, query }
}

// Grava o token @CÓDIGO no lugar do que foi digitado (o formato do fórum)
export function insertMention(
  text: string,
  start: number,
  caret: number,
  code: string,
): { text: string; caret: number } {
  const token = `@${code} `
  return {
    text: text.slice(0, start) + token + text.slice(caret),
    caret: start + token.length,
  }
}

const fold = (char: string) =>
  char
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

// Trecho do nome que casa com a busca, sem acentos (para o destaque)
export function matchRange(
  name: string,
  query: string,
): [number, number] | null {
  const target = fold(query)
  if (!target) return null
  const folded = Array.from(name, fold)
  for (let start = 0; start < folded.length; start++) {
    let built = ''
    for (let end = start; end < folded.length; end++) {
      built += folded[end]
      if (built === target) return [start, end + 1]
      if (!target.startsWith(built)) break
    }
  }
  return null
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
