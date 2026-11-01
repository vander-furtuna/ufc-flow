import React from "react"
import { Sparkles, BookOpen, Download, HelpCircle, GraduationCap } from "lucide-react"
import "./font.css"

function IndexPopup() {
  const handleOpenSIGAA = () => {
    window.open("https://si3.ufc.br/sigaa/graduacao/curriculo/lista.jsf", "_blank")
  }

  return (
    <div
      style={{
        width: 320,
        fontFamily: "'Geist', sans-serif",
        background: "oklch(12.9% 0.02 264.695)", // Solid dark chumbo from CSS
        color: "oklch(98.4% 0.003 247.858)",
        padding: "1.25rem",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "1.1rem",
        border: "1px solid oklch(24% 0.025 257.287)", // Solid border from CSS
        boxShadow: "none" // No shadows
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div
          style={{
            background: "oklch(24% 0.025 257.287)", // Flat solid border gray
            border: "1px solid rgba(255, 255, 255, 0.1)",
            padding: "0.45rem",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Sparkles size={16} color="white" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "white", letterSpacing: "-0.015em", fontFamily: "'ClashDisplay', sans-serif" }}>
            UFC FLOW
          </h2>
          <span style={{ fontSize: "0.7rem", color: "#64748b", display: "block", marginTop: "0.05rem" }}>
            v0.0.1 • Vanderlei Furtuna
          </span>
        </div>
      </header>

      {/* Intro */}
      <section style={{ fontSize: "0.75rem", color: "#cbd5e1", lineHeight: 1.4, background: "oklch(15.5% 0.02 260.031)", padding: "0.7rem", borderRadius: "6px", border: "1px solid oklch(24% 0.025 257.287)" }}>
        Extraia e modernize a grade curricular da <strong>UFC</strong> com um painel Kanban plano de alta densidade informativa, busca instantânea e realce de pré-requisitos.
      </section>

      {/* How to use */}
      <section style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <h3 style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "'ClashDisplay', sans-serif" }}>
          Como utilizar:
        </h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.725rem", color: "#64748b" }}>
          <div style={{ display: "flex", gap: "0.45rem", alignItems: "flex-start" }}>
            <GraduationCap size={13} style={{ color: "#94a3b8", flexShrink: 0, marginTop: "0.05rem" }} />
            <span>Acesse a tela de lista de currículos no SIGAA UFC.</span>
          </div>
          <div style={{ display: "flex", gap: "0.45rem", alignItems: "flex-start" }}>
            <BookOpen size={13} style={{ color: "#94a3b8", flexShrink: 0, marginTop: "0.05rem" }} />
            <span>Clique na <strong>Lupa</strong> do seu curso para abrir os detalhes.</span>
          </div>
          <div style={{ display: "flex", gap: "0.45rem", alignItems: "flex-start" }}>
            <Sparkles size={13} style={{ color: "#94a3b8", flexShrink: 0, marginTop: "0.05rem" }} />
            <span>Clique no botão plano <strong>"Grade Moderna"</strong> no canto inferior.</span>
          </div>
        </div>
      </section>

      {/* Action Button */}
      <button
        onClick={handleOpenSIGAA}
        style={{
          background: "white",
          border: "1px solid white",
          color: "black",
          padding: "0.6rem 1rem",
          fontWeight: 600,
          fontSize: "0.775rem",
          borderRadius: "6px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          boxShadow: "none",
          transition: "all 0.15s ease-out",
          fontFamily: "'Geist', sans-serif"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#cbd5e1"
          e.currentTarget.style.borderColor = "#cbd5e1"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "white"
          e.currentTarget.style.borderColor = "white"
        }}
      >
        <span>Abrir SIGAA UFC</span>
      </button>
    </div>
  )
}

export default IndexPopup
