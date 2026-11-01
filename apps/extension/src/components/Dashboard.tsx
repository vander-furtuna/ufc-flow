import React, { useState, useMemo } from "react"
import { 
  Sparkles, 
  X, 
  Search, 
  Download, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  HelpCircle,
  ArrowRightLeft,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  Info
} from "lucide-react"
import type { CurriculumStructure, Subject, Nature, Branch } from "../parser"

interface DashboardProps {
  data: CurriculumStructure
  onClose: () => void
}

export default function Dashboard({ data, onClose }: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [natureFilter, setNatureFilter] = useState<"TODAS" | Nature>("TODAS")
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL")
  const [hoveredSubject, setHoveredSubject] = useState<Subject | null>(null)
  
  // Dual-purpose side drawer: can display subject details or overall curriculum rules
  const [activeDrawer, setActiveDrawer] = useState<{
    type: 'subject'
    data: Subject
  } | {
    type: 'curriculum'
  } | null>(null)

  // Dynamically detect all unique natures present in the curriculum
  const availableNatures = useMemo(() => {
    const set = new Set<Nature>()
    data.subjects.forEach((s) => {
      if (s.nature) set.add(s.nature)
    })
    return ["TODAS", ...Array.from(set)] as const
  }, [data.subjects])

  // Dynamic calculations from subjects array
  const { mandatoryHours, optionalHours, mandatoryCount, optionalCount } = useMemo(() => {
    let mHours = 0
    let oHours = 0
    let mCount = 0
    let oCount = 0

    data.subjects.forEach((s) => {
      if (s.nature === "OBRIGATÓRIA") {
        mHours += s.duration
        mCount++
      } else {
        oHours += s.duration
        oCount++
      }
    })

    return {
      mandatoryHours: mHours,
      optionalHours: oHours,
      mandatoryCount: mCount,
      optionalCount: oCount
    }
  }, [data])

  // Memoize grouped subjects by semester
  const semesters = useMemo(() => {
    const map: Record<number, Subject[]> = {}
    
    data.subjects.forEach((sub) => {
      const sem = sub.semester || 99 // 99 fallback if semester undefined
      if (!map[sem]) map[sem] = []
      map[sem].push(sub)
    })

    return Object.entries(map)
      .map(([sem, list]) => ({
        semesterNum: parseInt(sem, 10),
        subjects: list
      }))
      .sort((a, b) => a.semesterNum - b.semesterNum)
  }, [data])

  // Flat list of filtered subject codes
  const filteredSubjectCodes = useMemo(() => {
    return data.subjects
      .filter((sub) => {
        const matchesSearch = 
          sub.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          sub.code.toLowerCase().includes(searchTerm.toLowerCase())
        
        const matchesNature = 
          natureFilter === "TODAS" || 
          sub.nature === natureFilter

        // Branch filtering logic:
        // Mandatory subjects (no branch) are shown in all views.
        // Optional subjects are filtered by branch if one is selected.
        const matchesBranch = 
          selectedBranchId === "ALL" || 
          sub.branch.length === 0 || 
          sub.branch.includes(selectedBranchId)

        return matchesSearch && matchesNature && matchesBranch
      })
      .map((sub) => sub.code)
  }, [data, searchTerm, natureFilter, selectedBranchId])

  // Helper to check relationships of the currently hovered card
  const isPrerequisiteOfHovered = (code: string) => {
    if (!hoveredSubject) return false
    return hoveredSubject.prerequisites.includes(code)
  }

  const isUnlockedByHovered = (code: string) => {
    if (!hoveredSubject) return false
    const sub = data.subjects.find((s) => s.code === code)
    return sub ? sub.prerequisites.includes(hoveredSubject.code) : false
  }

  // Action: Export JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    const fileName = `curriculo-${data.slug || "sigaa"}.json`
    downloadAnchor.setAttribute("download", fileName)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const displayCourseName = useMemo(() => {
    return data.slug.toUpperCase().replace(/-/g, " ")
  }, [data.slug])

  // Component - Subject Drawer Content
  const renderSubjectDrawerContent = (subject: Subject) => {
    const hasDetails = !!subject.details
    const semText = subject.semester === 99 
      ? "Optativo / Não definido" 
      : `${subject.semester}º Período`

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <h4 className="sigaa-drawer-section-title">Identificação</h4>
          <table className="sigaa-drawer-meta-table">
            <tbody>
              <tr>
                <td>Código</td>
                <td style={{ fontFamily: "var(--font-mono)", color: "white" }}>{subject.code}</td>
              </tr>
              <tr>
                <td>Tipo</td>
                <td>{subject.type}</td>
              </tr>
              <tr>
                <td>Natureza Geral</td>
                <td>
                  <span className={`sigaa-nature-badge ${subject.nature === 'OBRIGATÓRIA' ? 'badge-mandatory' : 'badge-optative'}`}>
                    {subject.nature}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Recomendado</td>
                <td>{semText}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h4 className="sigaa-drawer-section-title">Carga Horária</h4>
          {hasDetails && subject.details ? (
            <div className="sigaa-hours-grid">
              <div className="sigaa-hour-card">
                <div className="sigaa-hour-card-val">{subject.details.aula}h</div>
                <div className="sigaa-hour-card-lbl">Aula</div>
              </div>
              <div className="sigaa-hour-card">
                <div className="sigaa-hour-card-val">{subject.details.lab}h</div>
                <div className="sigaa-hour-card-lbl">Lab</div>
              </div>
              <div className="sigaa-hour-card">
                <div className="sigaa-hour-card-val">{subject.details.ead}h</div>
                <div className="sigaa-hour-card-lbl">EAD</div>
              </div>
              <div className="sigaa-hour-card">
                <div className="sigaa-hour-card-val">{subject.details.ext}h</div>
                <div className="sigaa-hour-card-lbl">Ext.</div>
              </div>
              <div className="sigaa-hour-card">
                <div className="sigaa-hour-card-val">{subject.details.cr}</div>
                <div className="sigaa-hour-card-lbl">Crédito</div>
              </div>
              <div className="sigaa-hour-card">
                <div className="sigaa-hour-card-val" style={{ color: "#38bdf8" }}>{subject.duration}h</div>
                <div className="sigaa-hour-card-lbl">Total</div>
              </div>
            </div>
          ) : (
            <div className="sigaa-hours-grid" style={{ gridTemplateColumns: "1fr" }}>
              <div className="sigaa-hour-card" style={{ padding: "0.75rem" }}>
                <div className="sigaa-hour-card-val" style={{ fontSize: "1.1rem" }}>{subject.duration}h</div>
                <div className="sigaa-hour-card-lbl">Total de Horas</div>
              </div>
            </div>
          )}
        </div>

        {/* Detailed branchRelations mapping if present */}
        {subject.branchRelations && subject.branchRelations.length > 0 && (
          <div>
            <h4 className="sigaa-drawer-section-title">Regras por Ênfase/Trilha</h4>
            <table className="sigaa-drawer-meta-table">
              <tbody>
                {subject.branchRelations.map((rel, index) => {
                  const branch = data.branchs.find((b) => b.id === rel.branchId)
                  if (!branch) return null
                  return (
                    <tr key={index}>
                      <td style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: branch.color }} />
                        <span>{branch.name}</span>
                      </td>
                      <td>
                        <span className={`sigaa-nature-badge ${rel.nature === 'OBRIGATÓRIA' ? 'badge-mandatory' : 'badge-optative'}`}>
                          {rel.nature}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <h4 className="sigaa-drawer-section-title">Pré-requisitos</h4>
          {subject.prerequisites.length > 0 ? (
            <div className="sigaa-drawer-badge-group">
              {subject.prerequisites.map((code) => {
                const found = data.subjects.find((s) => s.code === code)
                return (
                  <button
                    key={code}
                    className="sigaa-drawer-relation-btn"
                    onClick={() => {
                      if (found) setActiveDrawer({ type: 'subject', data: found })
                    }}
                    title={found ? found.name : 'Ver disciplina'}
                  >
                    {code}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="sigaa-drawer-no-data">Nenhum pré-requisito registrado.</p>
          )}
        </div>

        <div>
          <h4 className="sigaa-drawer-section-title">Co-requisitos</h4>
          {subject.corequisites && subject.corequisites.length > 0 ? (
            <div className="sigaa-drawer-badge-group">
              {subject.corequisites.map((code) => {
                const found = data.subjects.find((s) => s.code === code)
                return (
                  <button
                    key={code}
                    className="sigaa-drawer-relation-btn"
                    onClick={() => {
                      if (found) setActiveDrawer({ type: 'subject', data: found })
                    }}
                    title={found ? found.name : 'Ver disciplina'}
                  >
                    {code}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="sigaa-drawer-no-data">Nenhum co-requisito registrado.</p>
          )}
        </div>

        <div>
          <h4 className="sigaa-drawer-section-title">Equivalências</h4>
          {subject.equivalences && subject.equivalences.length > 0 ? (
            <div className="sigaa-drawer-badge-group">
              {subject.equivalences.map((code) => {
                const found = data.subjects.find((s) => s.code === code)
                return (
                  <button
                    key={code}
                    className="sigaa-drawer-relation-btn"
                    onClick={() => {
                      if (found) setActiveDrawer({ type: 'subject', data: found })
                    }}
                    title={found ? found.name : 'Ver disciplina'}
                  >
                    {code}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="sigaa-drawer-no-data">Nenhuma equivalência registrada.</p>
          )}
        </div>

        {subject.branch && subject.branch.length > 0 && (!subject.branchRelations || subject.branchRelations.length === 0) && (
          <div>
            <h4 className="sigaa-drawer-section-title">Ênfases Associadas</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {subject.branch.map((bId) => {
                const branch = data.branchs.find((b) => b.id === bId)
                if (!branch) return null
                return (
                  <div key={bId} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: branch.color }} />
                    <span style={{ color: "white", fontWeight: 600 }}>{branch.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Component - Curriculum Drawer Content
  const renderCurriculumDrawerContent = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <h4 className="sigaa-drawer-section-title">Dados Gerais</h4>
          <table className="sigaa-drawer-meta-table">
            <tbody>
              <tr>
                <td>Cidade</td>
                <td>{data.city || 'Não informado'}</td>
              </tr>
              <tr>
                <td>Matriz / Entrada</td>
                <td>{data.period}</td>
              </tr>
              <tr>
                <td>Código Matriz</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}>{data.id}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h4 className="sigaa-drawer-section-title">Cargas Horárias Mínimas</h4>
          <table className="sigaa-drawer-meta-table">
            <tbody>
              <tr>
                <td>Mínimo Exigido</td>
                <td style={{ color: "#38bdf8" }}>{data.minTotalHours}h</td>
              </tr>
              {data.mandatoryHours !== undefined && (
                <tr>
                  <td>Obrigatórias</td>
                  <td>{data.mandatoryHours}h</td>
                </tr>
              )}
              {data.optativeHours !== undefined && (
                <tr>
                  <td>Optativas</td>
                  <td>{data.optativeHours}h</td>
                </tr>
              )}
              {data.extensionHours !== undefined && (
                <tr>
                  <td>Extensão</td>
                  <td>{data.extensionHours}h</td>
                </tr>
              )}
              {data.mandatoryAcademicActivityHours !== undefined && (
                <tr>
                  <td>Atividade Acadêmica Espec.</td>
                  <td>{data.mandatoryAcademicActivityHours}h</td>
                </tr>
              )}
              {data.maxOptativeFreeHours !== undefined && (
                <tr>
                  <td>Máx. Optativas Livres</td>
                  <td>{data.maxOptativeFreeHours}h</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {(data.minPeriods !== undefined || data.avgPeriods !== undefined || data.maxPeriods !== undefined) && (
          <div>
            <h4 className="sigaa-drawer-section-title">Prazos de Conclusão</h4>
            <table className="sigaa-drawer-meta-table">
              <tbody>
                {data.minPeriods !== undefined && (
                  <tr>
                    <td>Período Mínimo</td>
                    <td>{data.minPeriods} semestres</td>
                  </tr>
                )}
                {data.avgPeriods !== undefined && (
                  <tr>
                    <td>Período Médio</td>
                    <td>{data.avgPeriods} semestres</td>
                  </tr>
                )}
                {data.maxPeriods !== undefined && (
                  <tr>
                    <td>Período Máximo</td>
                    <td>{data.maxPeriods} semestres</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {data.periodHours && (
          <div>
            <h4 className="sigaa-drawer-section-title">Carga Horária por Período</h4>
            <table className="sigaa-drawer-meta-table">
              <tbody>
                <tr>
                  <td>Mínima</td>
                  <td>{data.periodHours.min}h</td>
                </tr>
                <tr>
                  <td>Média</td>
                  <td>{data.periodHours.avg}h</td>
                </tr>
                <tr>
                  <td>Máxima</td>
                  <td>{data.periodHours.max}h</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Detailed branchs listing with type, minHours, minComponents */}
        {data.branchs && data.branchs.length > 0 && (
          <div>
            <h4 className="sigaa-drawer-section-title">Ênfases e Grupos</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {data.branchs.map((b) => (
                <div 
                  key={b.id} 
                  style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "0.15rem", 
                    borderBottom: "1px solid rgba(255, 255, 255, 0.03)", 
                    paddingBottom: "0.4rem" 
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: b.color }} />
                    <span style={{ color: "white", fontWeight: 600 }}>{b.name}</span>
                  </div>
                  {(b.minHours || b.minComponents || b.type) && (
                    <div style={{ paddingLeft: "0.85rem", fontSize: "0.65rem", color: "#64748b", display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
                      {b.type && <span>Tipo: {b.type}</span>}
                      {b.minHours && <span>Carga Mín: {b.minHours}h</span>}
                      {b.minComponents && <span>Comp. Mín: {b.minComponents}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="sigaa-dashboard-overlay">
      <div className="sigaa-dashboard-backdrop" onClick={onClose} />
      
      <div className="sigaa-dashboard-window">
        {/* Header */}
        <header className="sigaa-dashboard-header">
          <div className="sigaa-header-title-area">
            <div className="sigaa-logo-badge">
              <Sparkles className="sigaa-logo-icon" size={18} />
            </div>
            <div>
              <h1 className="sigaa-dashboard-title">UFC FLOW</h1>
              <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", marginTop: "0.2rem", flexWrap: "wrap" }}>
                <p className="sigaa-dashboard-subtitle">{displayCourseName}</p>
                {data.city && (
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    <MapPin size={12} /> {data.city}
                  </span>
                )}
                {data.period && (
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    <Calendar size={12} /> Matriz {data.period}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="sigaa-header-actions">
            <button 
              className="sigaa-btn-secondary"
              onClick={() => {
                if (activeDrawer?.type === 'curriculum') {
                  setActiveDrawer(null)
                } else {
                  setActiveDrawer({ type: 'curriculum' })
                }
              }}
              title="Visualizar regras e prazos curriculares"
              style={{
                background: activeDrawer?.type === 'curriculum' ? 'var(--border)' : 'transparent',
                color: activeDrawer?.type === 'curriculum' ? 'white' : '#cbd5e1',
              }}
            >
              <Layers size={15} />
              <span>Regras Curriculares</span>
            </button>
            <button 
              className="sigaa-btn-primary" 
              onClick={handleExportJSON}
              title="Exportar todos os dados em formato JSON"
            >
              <Download size={15} />
              <span>Exportar JSON</span>
            </button>
            <button className="sigaa-btn-close" onClick={onClose} aria-label="Fechar">
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="sigaa-stats-grid">
          <div className="sigaa-stat-card bg-gradient-blue">
            <div className="sigaa-stat-icon-wrapper">
              <Clock size={16} />
            </div>
            <div>
              <div className="sigaa-stat-val">{data.minTotalHours || 0}h</div>
              <div className="sigaa-stat-label">CARGA HORÁRIA MÍNIMA</div>
            </div>
          </div>

          <div className="sigaa-stat-card bg-gradient-emerald">
            <div className="sigaa-stat-icon-wrapper">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <div className="sigaa-stat-val">{data.mandatoryHours ?? mandatoryHours}h</div>
              <div className="sigaa-stat-label">OBRIGATÓRIAS ({mandatoryCount})</div>
            </div>
          </div>

          <div className="sigaa-stat-card bg-gradient-purple">
            <div className="sigaa-stat-icon-wrapper">
              <HelpCircle size={16} />
            </div>
            <div>
              <div className="sigaa-stat-val">{data.optativeHours ?? optionalHours}h</div>
              <div className="sigaa-stat-label">OPTATIVAS ({optionalCount})</div>
            </div>
          </div>

          <div className="sigaa-stat-card bg-gradient-slate">
            <div className="sigaa-stat-icon-wrapper">
              <BookOpen size={16} />
            </div>
            <div>
              <div className="sigaa-stat-val">{data.subjects.length}</div>
              <div className="sigaa-stat-label">DISCIPLINAS TOTAIS</div>
            </div>
          </div>
        </section>

        {/* Interactive Filters Bar */}
        <section className="sigaa-filters-bar">
          <div className="sigaa-search-wrapper">
            <Search className="sigaa-search-icon" size={15} />
            <input 
              type="text" 
              placeholder="Buscar por código ou nome de disciplina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sigaa-search-input"
            />
          </div>

          {/* Dynamic Nature Filter Tabs */}
          <div className="sigaa-nature-filters" style={{ flexWrap: "wrap", gap: "0.25rem" }}>
            {availableNatures.map((nature) => {
              const label = nature === "TODAS" 
                ? "Todas" 
                : nature.charAt(0) + nature.slice(1).toLowerCase().replace(/_/g, " ")
              return (
                <button 
                  key={nature}
                  className={`sigaa-filter-tab ${natureFilter === nature ? 'active' : ''}`}
                  onClick={() => setNatureFilter(nature)}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="sigaa-help-legend">
            <ArrowRightLeft size={13} className="text-muted" />
            <span className="text-xs text-muted">
              Passe o mouse para ver Pré-requisitos <span className="legend-pre">(Vermelho)</span> e o que ela Libera <span className="legend-post">(Verde)</span>. Clique para ver detalhes.
            </span>
          </div>
        </section>

        {/* Emphasis / Branches Selector Bar (if branches exist) */}
        {data.branchs && data.branchs.length > 0 && (
          <section className="sigaa-filters-bar" style={{ paddingTop: 0, borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <Layers size={13} /> ÊNFASE:
              </span>
              <button
                className={`sigaa-filter-tab ${selectedBranchId === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedBranchId('ALL')}
                style={{ padding: "0.25rem 0.75rem", fontSize: "0.725rem" }}
              >
                Matriz Geral
              </button>
              {data.branchs.map((branch) => (
                <button
                  key={branch.id}
                  className={`sigaa-filter-tab ${selectedBranchId === branch.id ? 'active' : ''}`}
                  onClick={() => setSelectedBranchId(branch.id)}
                  style={{ 
                    padding: "0.25rem 0.75rem", 
                    fontSize: "0.725rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem"
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: branch.color, display: "inline-block" }} />
                  {branch.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Kanban + Drawer Container */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
          {/* Semesters Kanban Grid */}
          <div className="sigaa-kanban-container" style={{ flex: 1 }}>
            <div className="sigaa-kanban-board">
              {semesters.map(({ semesterNum, subjects }) => {
                const hasVisibleSubjects = subjects.some(s => filteredSubjectCodes.includes(s.code))
                if (!hasVisibleSubjects && searchTerm) return null

                const isOptionalColumn = semesterNum === 99 || semesterNum <= 0
                const title = isOptionalColumn ? "DISCIPLINAS OPTATIVAS" : `${semesterNum}º PERÍODO`

                return (
                  <div key={semesterNum} className={`sigaa-kanban-column ${isOptionalColumn ? 'optativas-column' : ''}`}>
                    <div className="sigaa-column-header">
                      <h3 className="sigaa-column-title">{title}</h3>
                      <span className="sigaa-column-count">
                        {subjects.filter(s => filteredSubjectCodes.includes(s.code)).length}
                      </span>
                    </div>

                    <div className="sigaa-column-content">
                      {subjects.map((subject) => {
                        const isVisible = filteredSubjectCodes.includes(subject.code)
                        if (!isVisible) return null

                        const isPrereq = isPrerequisiteOfHovered(subject.code)
                        const isUnlock = isUnlockedByHovered(subject.code)
                        const isHovered = hoveredSubject?.code === subject.code
                        const isSelected = activeDrawer?.type === 'subject' && activeDrawer.data.code === subject.code
                        
                        let cardStateClass = ""
                        if (isHovered) cardStateClass = "sigaa-card-hovered"
                        else if (isPrereq) cardStateClass = "sigaa-card-prereq"
                        else if (isUnlock) cardStateClass = "sigaa-card-unlock"

                        const isOptional = subject.nature !== "OBRIGATÓRIA"

                        return (
                          <div
                            key={subject.id}
                            className={`sigaa-subject-card ${isOptional ? 'nature-optativa' : 'nature-obrigatoria'} ${cardStateClass} ${isSelected ? 'sigaa-card-selected' : ''}`}
                            onMouseEnter={() => setHoveredSubject(subject)}
                            onMouseLeave={() => setHoveredSubject(null)}
                            onClick={() => setActiveDrawer({ type: 'subject', data: subject })}
                          >
                            <div className="sigaa-card-header">
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <span className="sigaa-subject-code">{subject.code}</span>
                                {/* Display emphasis indicator dots if subject belongs to branches */}
                                {subject.branch.map((bId) => {
                                  const branch = data.branchs.find(b => b.id === bId)
                                  if (!branch) return null
                                  return (
                                    <span 
                                      key={bId}
                                      style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: "50%",
                                        background: branch.color,
                                        display: "inline-block"
                                      }}
                                      title={`Ênfase: ${branch.name}`}
                                    />
                                  )
                                })}
                              </div>
                              <span className={`sigaa-nature-badge ${isOptional ? 'badge-optative' : 'badge-mandatory'}`}>
                                {subject.nature.charAt(0) + subject.nature.slice(1).toLowerCase().replace(/_/g, " ")}
                              </span>
                            </div>

                            <h4 className="sigaa-subject-name" title={subject.name}>
                              {subject.name}
                            </h4>

                            <div className="sigaa-card-footer">
                              <span className="sigaa-subject-duration" title="Carga Horária">
                                <Clock size={12} />
                                {subject.duration}h
                              </span>
                              
                              {subject.prerequisites.length > 0 && (
                                <span 
                                  className="sigaa-subject-prereqs-badge" 
                                  title={`${subject.prerequisites.length} pré-requisito(s): ${subject.prerequisites.join(', ')}`}
                                >
                                  {subject.prerequisites.length} Req.
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Side Drawer */}
          {activeDrawer && (
            <aside className="sigaa-side-drawer">
              <div className="sigaa-side-drawer-header">
                <div style={{ maxWidth: "85%" }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "0.15rem" }}>
                    {activeDrawer.type === 'subject' ? 'Detalhes da Disciplina' : 'Estrutura Curricular'}
                  </span>
                  <h2 className="sigaa-side-drawer-title">
                    {activeDrawer.type === 'subject' ? activeDrawer.data.name : 'Regras & Limites'}
                  </h2>
                </div>
                <button 
                  className="sigaa-btn-close" 
                  onClick={() => setActiveDrawer(null)}
                  style={{ padding: "0.25rem" }}
                  aria-label="Fechar painel"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="sigaa-side-drawer-content">
                {activeDrawer.type === 'subject' ? (
                  renderSubjectDrawerContent(activeDrawer.data)
                ) : (
                  renderCurriculumDrawerContent()
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
