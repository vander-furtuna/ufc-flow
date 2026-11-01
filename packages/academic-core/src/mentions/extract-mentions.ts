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
