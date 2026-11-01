// Forma usada para comparar textos de busca: minúsculas e sem acentos.
// É a mesma no web (filtros) e na API (coluna search_name).
export function normalizeSearchText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}
