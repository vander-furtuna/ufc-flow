import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Abre uma fixture do SIGAA como Document, como o content script a vê. O
// Vitest roda na pasta do pacote; no jsdom, import.meta.url não é um arquivo.
export function loadFixture(name: string): Document {
  const html = readFileSync(
    join(process.cwd(), 'src/sigaa/__fixtures__', name),
    'utf8',
  )
  return new DOMParser().parseFromString(html, 'text/html')
}

export const CURRICULUM_FIXTURES = [
  'estrutura-agronomia-2024-2.html',
  'estrutura-arquitetura-e-urbanismo-2023-1.html',
  'estrutura-ciencias-de-dados-2024-1.html',
  'estrutura-engenharia-de-computacao-2006-2.html',
  'estrutura-engenharia-de-materiais-2010-1.html',
  'estrutura-engenharia-metalurgica-2023-1.html',
  'estrutura-gestao-de-politicas-publicas-2025-1.html',
  'estrutura-matematica-2024-1.html',
  'estrutura-medicina-2024-1.html',
  'estrutura-musica-2020-1.html',
  'estrutura-psicologia-2025-1.html',
  'pagina-estrutura-engenharia-de-computacao-2006-2.html',
] as const
