import '~styles/generated.css'
import '~styles/fonts.css'

import { useState, type ChangeEvent } from 'react'

import { Logo } from '../components/ui'
import { downloadText, importFileName, importJson } from '../lib/download'
import { extractCurriculum, type Extraction } from '../lib/extraction'
import { Panel } from '../panel/panel'

// Prévia do painel com uma página do SIGAA salva no computador (Ctrl+S na
// estrutura curricular). Abra em chrome-extension://<id>/tabs/preview.html.
export default function Preview() {
  const [html, setHtml] = useState<string | null>(null)
  const [manualCourseId, setManualCourseId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const extraction: Extraction | null = html
    ? extractCurriculum({
        doc: new DOMParser().parseFromString(html, 'text/html'),
        search: { selectedCourseId: null, courses: [], curriculum: null },
        manualCourseId,
        now: new Date(),
        url: null,
      })
    : null

  const load = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const buffer = await file.arrayBuffer()
    const head = new TextDecoder('latin1').decode(buffer.slice(0, 3000))
    const encoding = /charset=windows-1252/i.test(head)
      ? 'windows-1252'
      : 'utf-8'
    const text = new TextDecoder(encoding).decode(buffer)
    const read = extractCurriculum({
      doc: new DOMParser().parseFromString(text, 'text/html'),
      search: { selectedCourseId: null, courses: [], curriculum: null },
      manualCourseId: null,
      now: new Date(),
      url: null,
    })
    setError(
      read ? null : 'Este arquivo não é a página de uma estrutura curricular.',
    )
    setManualCourseId(null)
    setHtml(read ? text : null)
  }

  if (extraction) {
    return (
      <Panel
        extraction={extraction}
        onClose={() => setHtml(null)}
        onPickCourse={setManualCourseId}
        onDownload={() => {
          if (extraction.data && extraction.exportable) {
            downloadText(
              importJson(extraction.data),
              importFileName(extraction.data),
            )
          }
        }}
      />
    )
  }

  return (
    <main className="text-foreground mx-auto flex max-w-md flex-col gap-4 p-10 font-sans">
      <Logo className="size-12" />
      <h1 className="font-clash text-2xl font-semibold">Prévia do painel</h1>
      <p className="text-muted-foreground text-sm">
        Escolha uma página de estrutura curricular salva do SIGAA para ver o
        painel como ele aparece sobre o SIGAA.
      </p>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Página salva (.html)
        <input type="file" accept=".html,.htm" onChange={load} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </main>
  )
}
