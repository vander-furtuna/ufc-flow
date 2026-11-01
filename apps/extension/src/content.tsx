import React, { useState, useEffect } from "react"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { Sparkles } from "lucide-react"
import { parseCurriculum } from "./parser"
import type { CurriculumStructure } from "./parser"
import Dashboard from "./components/Dashboard"
import cssText from "data-text:./style.css"

import clashDisplayUrl from "url:~assets/ClashDisplay-Variable.woff2"
import geistUrl from "url:~assets/Geist-Variable.woff2"
import geistMonoUrl from "url:~assets/GeistMono-Variable.woff2"

// Configure matching URLs for the SIGAA curriculum page
export const config: PlasmoCSConfig = {
  matches: [
    "https://si3.ufc.br/sigaa/graduacao/curriculo/lista.jsf*",
    "https://si3.ufc.br/sigaa/graduacao/curriculo/lista.jsf?*"
  ],
  run_at: "document_idle"
}

// Inject custom styles directly into Plasmo's Shadow DOM
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export default function SigaaExtension() {
  const [isOpen, setIsOpen] = useState(false)
  const [curriculumData, setCurriculumData] = useState<CurriculumStructure | null>(null)
  const [showLauncher, setShowLauncher] = useState(false)

  // Verify on mount (and on DOM changes) if the page actually contains the curriculum tables
  useEffect(() => {
    // Inject fonts globally into main document head (bypasses CSP and enables Shadow DOM inheritance)
    const styleEl = document.createElement("style")
    styleEl.id = "sigaa-modern-fonts"
    styleEl.textContent = `
      @font-face {
        font-family: 'ClashDisplay';
        font-style: normal;
        font-weight: 100 900;
        font-display: swap;
        src: url('${clashDisplayUrl}') format('woff2');
      }
      @font-face {
        font-family: 'Geist';
        font-style: normal;
        font-weight: 100 900;
        font-display: swap;
        src: url('${geistUrl}') format('woff2');
      }
      @font-face {
        font-family: 'Geist Mono';
        font-style: normal;
        font-weight: 100 900;
        font-display: swap;
        src: url('${geistMonoUrl}') format('woff2');
      }
    `
    document.head.appendChild(styleEl)

    const checkCurriculumPresence = () => {
      const hasTables = document.querySelectorAll("table.subFormulario").length >= 2
      const hasFormSummary = document.querySelector("table.formulario") !== null
      
      // We show the floating launcher only if we detect at least one of these indicator tables
      if (hasTables || hasFormSummary) {
        setShowLauncher(true)
      } else {
        setShowLauncher(false)
      }
    }

    // Run initial check
    checkCurriculumPresence()

    // Observe dynamic changes in the DOM (common in JSF pages)
    const observer = new MutationObserver(checkCurriculumPresence)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      styleEl.remove()
    }
  }, [])

  const handleLaunch = () => {
    const data = parseCurriculum(document)
    if (data && data.subjects.length > 0) {
      setCurriculumData(data)
      setIsOpen(true)
    } else {
      alert(
        "✨ SIGAA Curriculum Explorer:\n\n" +
        "Não foi possível extrair a grade curricular nesta tela.\n" +
        "Por favor, pesquise um curso e clique na 'Lupa' (Visualizar Estrutura Curricular) " +
        "para que os dados fiquem visíveis e prontos para modernização!"
      )
    }
  }

  if (!showLauncher) return null

  return (
    <>
      {/* Floating launcher badge visible directly on the SIGAA page */}
      <button 
        className="sigaa-modern-launcher-btn" 
        onClick={handleLaunch}
        title="Visualizar grade curricular moderna"
      >
        <Sparkles className="launcher-icon" size={16} />
        <span>Grade Moderna</span>
      </button>

      {/* Modern Dashboard Modal */}
      {isOpen && curriculumData && (
        <Dashboard 
          data={curriculumData} 
          onClose={() => setIsOpen(false)} 
        />
      )}
    </>
  )
}
