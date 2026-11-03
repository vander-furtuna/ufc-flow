// Token @CÓDIGO gravado no texto das mensagens do fórum. O código não pode
// estar colado em letras, dígitos ou "_" (evita e-mails e códigos maiores).
const MENTION_PATTERN =
  /(?<![\p{L}\p{N}_])@([A-Z]{2,5}\d{3,5})(?![\p{L}\p{N}_])/gu

// Códigos mencionados, na ordem da primeira aparição e sem repetição
export function extractMentions(text: string): string[] {
  const codes = new Set<string>()
  for (const match of text.matchAll(MENTION_PATTERN)) {
    codes.add(match[1] as string)
  }
  return [...codes]
}

export type MentionSegment = { text: string } | { code: string }

// O texto em trechos e tokens @CÓDIGO, na ordem, para a leitura trocar o
// token por um chip. Usa o mesmo padrão de extractMentions.
export function splitMentions(text: string): MentionSegment[] {
  const segments: MentionSegment[] = []
  let last = 0
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const start = match.index
    if (start > last) segments.push({ text: text.slice(last, start) })
    segments.push({ code: match[1] as string })
    last = start + match[0].length
  }
  if (last < text.length) segments.push({ text: text.slice(last) })
  return segments
}
