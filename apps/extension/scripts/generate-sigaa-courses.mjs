// Gera src/sigaa/catalog/sigaa-courses.json a partir da lista pública de
// cursos do SIGAA salva no navegador (Ctrl+S):
// https://si3.ufc.br/sigaa/public/curso/lista.jsf?nivel=G&aba=p-graduacao
//
//   node scripts/generate-sigaa-courses.mjs "<arquivo salvo>.html"
//
// Na fase 5 o catálogo passa a vir da API (sigaa_courses), atualizado por
// uma tarefa agendada (D34). O nome do coordenador não é guardado.
import { readFileSync, writeFileSync } from 'node:fs'

import { JSDOM } from 'jsdom'

const [file] = process.argv.slice(2)
if (!file) throw new Error('Informe o HTML da lista pública de cursos')

const buffer = readFileSync(file)
const encoding = /charset=windows-1252/i.test(
  buffer.subarray(0, 3000).toString('latin1'),
)
  ? 'windows-1252'
  : 'utf-8'
const { document } = new JSDOM(new TextDecoder(encoding).decode(buffer)).window

const clean = (text) => (text ?? '').replace(/\s+/g, ' ').trim()
const courses = []
let unit = null

for (const row of document.querySelectorAll('table.listagem tr')) {
  const link = row.querySelector('a[href*="portal.jsf?id="]')
  if (!link) {
    const text = clean(row.textContent)
    // Cabeçalho de unidade: "CUFCSOBRAL - CAMPUS DA UFC EM SOBRAL"
    if (text && !text.startsWith('Nome Sede')) unit = text
    continue
  }
  const cells = row.querySelectorAll('td')
  const separator = unit?.indexOf(' - ') ?? -1
  courses.push({
    sigaaId: /id=(\d+)/.exec(link.getAttribute('href'))[1],
    name: clean(cells[0]?.textContent),
    city: clean(cells[1]?.textContent),
    modality: /dist/i.test(cells[2]?.textContent ?? '')
      ? 'DISTANCE'
      : 'IN_PERSON',
    unitAcronym: separator > 0 ? unit.slice(0, separator) : null,
    unitName: separator > 0 ? unit.slice(separator + 3) : unit,
  })
}

const output = new URL(
  '../src/sigaa/catalog/sigaa-courses.json',
  import.meta.url,
)
writeFileSync(output, JSON.stringify(courses, null, 2) + '\n')
console.log(`${courses.length} cursos gravados`)
