import cssText from 'data-text:~styles/generated.css'
import type { PlasmoCSConfig, PlasmoGetStyle } from 'plasmo'
import clashUrl from 'url:../../assets/ClashDisplay-Variable.woff2'
import geistMonoUrl from 'url:../../assets/GeistMono-Variable.woff2'
import geistUrl from 'url:../../assets/Geist-Variable.woff2'
import { useEffect, useRef, useState } from 'react'

import { downloadText, importFileName, importJson } from '../lib/download'
import { extractCurriculum, type Extraction } from '../lib/extraction'
import type {
  ContentMessage,
  JsonResponse,
  SummaryResponse,
} from '../lib/messages'
import {
  captureCurriculumClick,
  captureSearchPage,
  readSearchCapture,
} from '../lib/search-capture'
import { withPropertyFallbacks } from '../lib/shadow-css'
import { Panel } from '../panel/panel'
import { Launcher } from '../panel/launcher'

// A tela de busca e a página da estrutura têm a mesma URL (JSF)
export const config: PlasmoCSConfig = {
  matches: ['https://si3.ufc.br/sigaa/graduacao/curriculo/lista.jsf*'],
  run_at: 'document_idle',
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement('style')
  style.textContent = withPropertyFallbacks(cssText)
  return style
}

// @font-face não funciona dentro do Shadow DOM: as fontes vão no documento
function injectFonts() {
  if (document.getElementById('ufc-flow-fonts')) return
  const style = document.createElement('style')
  style.id = 'ufc-flow-fonts'
  style.textContent = [
    ['ClashDisplay', clashUrl],
    ['Geist', geistUrl],
    ['Geist Mono', geistMonoUrl],
  ]
    .map(
      ([family, url]) =>
        `@font-face { font-family: '${family}'; font-weight: 100 900; font-display: swap; src: url('${url}') format('woff2'); }`,
    )
    .join('\n')
  document.head.append(style)
}

const manualKey = (code: string) => `ufc-flow:manual-course:${code}`

function extract(): Extraction | null {
  const code =
    document.querySelector('table.formulario td')?.textContent?.trim() ?? ''
  return extractCurriculum({
    doc: document,
    search: readSearchCapture(),
    manualCourseId: sessionStorage.getItem(manualKey(code)),
    now: new Date(),
    url: location.href.split('?')[0] ?? null,
  })
}

export default function SigaaContent() {
  const [extraction, setExtraction] = useState<Extraction | null>(extract)
  const [cardOpen, setCardOpen] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  // O listener de mensagens é registrado uma vez e lê a extração mais recente
  const latest = useRef(extraction)
  useEffect(() => {
    latest.current = extraction
  }, [extraction])

  // Tela de busca: guarda o curso selecionado e a EC clicada (D34)
  useEffect(() => {
    if (extraction) return
    captureSearchPage(document)
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element) captureCurriculumClick(event.target)
    }
    // Na captura, antes de o JSF enviar o formulário
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [extraction])

  useEffect(() => {
    if (extraction) injectFonts()
  }, [extraction])

  // Pedidos do popup
  useEffect(() => {
    const onMessage = (
      message: ContentMessage,
      _sender: chrome.runtime.MessageSender,
      respond: (response: SummaryResponse | JsonResponse | null) => void,
    ) => {
      const current = latest.current
      if (message.type === 'GET_SUMMARY') {
        respond(
          current
            ? { summary: current.summary, exportable: current.exportable }
            : null,
        )
      } else if (message.type === 'OPEN_PANEL') {
        if (current) setPanelOpen(true)
        respond(null)
      } else if (message.type === 'GET_JSON') {
        respond(
          current?.data && current.exportable
            ? {
                json: importJson(current.data),
                fileName: importFileName(current.data),
              }
            : null,
        )
      }
    }
    chrome.runtime.onMessage.addListener(onMessage)
    return () => chrome.runtime.onMessage.removeListener(onMessage)
  }, [])

  if (!extraction) return null

  const download = () => {
    if (!extraction.data || !extraction.exportable) return
    downloadText(importJson(extraction.data), importFileName(extraction.data))
  }

  const pickCourse = (sigaaId: string) => {
    sessionStorage.setItem(manualKey(extraction.summary.code), sigaaId)
    setExtraction(extract())
  }

  return (
    <>
      {!panelOpen && (
        <Launcher
          summary={extraction.summary}
          cardOpen={cardOpen}
          onToggleCard={() => setCardOpen(true)}
          onDismiss={() => setCardOpen(false)}
          onOpenPanel={() => setPanelOpen(true)}
        />
      )}
      {panelOpen && (
        <Panel
          extraction={extraction}
          onClose={() => setPanelOpen(false)}
          onPickCourse={pickCourse}
          onDownload={download}
        />
      )}
    </>
  )
}
