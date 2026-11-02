import type { TimeSlot } from '@ufc-flow/academic-core'

export type InstructorRef = { siape: string; name: string; profileUrl: string }

// Turma como sai da página pública do SIGAA, para um curso
export type ScrapedSection = {
  subjectCode: string
  subjectName: string
  sectionCode: string
  instructors: InstructorRef[]
  // Vagas reservadas para o curso coletado
  reservedSeats: number
  slots: TimeSlot[]
  validFrom: string | null
  validTo: string | null
}

// Turma guardada: chave natural (termo, disciplina, turma)
export type SectionRecord = Omit<ScrapedSection, 'reservedSeats'> & {
  id: string
  termId: string
  fingerprint: string
  firstSeenAt: Date
  lastSeenAt: Date
  removedAt: Date | null
}

export type SyncPlan = {
  sections: SectionRecord[]
  // Ofertas do curso coletado: as que não estão aqui saem
  offers: { sectionId: string; reservedSeats: number }[]
  // Turmas novas, que voltaram ou com horário ou docente diferente
  changed: number
}

// FNV-1a de 32 bits: estável, curto e sem depender de crypto no domínio
function fnv1a(text: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

// Muda só quando horário ou docentes mudam (modelagem, Coleta)
export function sectionFingerprint(
  slots: readonly TimeSlot[],
  instructorSiapes: readonly string[],
): string {
  const canonical = [
    ...slots
      .map((slot) => `${slot.weekday}|${slot.startTime}|${slot.endTime}`)
      .sort(),
    '#',
    ...[...instructorSiapes].sort(),
  ].join(';')
  return fnv1a(canonical)
}

const keyOf = (section: { subjectCode: string; sectionCode: string }) =>
  `${section.subjectCode}|${section.sectionCode}`

// Junta a coleta de um curso com as turmas já guardadas do semestre, pela
// chave natural, para os ids sobreviverem às coletas
export function planSync(
  scraped: readonly ScrapedSection[],
  ctx: {
    termId: string
    now: Date
    newId: () => string
    existing: readonly SectionRecord[]
  },
): SyncPlan {
  const byKey = new Map(
    ctx.existing.map((section) => [keyOf(section), section]),
  )
  const seen = new Set<string>()
  const plan: SyncPlan = { sections: [], offers: [], changed: 0 }

  for (const item of scraped) {
    const key = keyOf(item)
    if (seen.has(key)) continue
    seen.add(key)
    const { reservedSeats, ...data } = item
    const fingerprint = sectionFingerprint(
      item.slots,
      item.instructors.map((instructor) => instructor.siape),
    )
    const current = byKey.get(key)
    if (
      !current ||
      current.fingerprint !== fingerprint ||
      current.removedAt !== null
    ) {
      plan.changed++
    }
    const section: SectionRecord = {
      ...data,
      id: current?.id ?? ctx.newId(),
      termId: ctx.termId,
      fingerprint,
      firstSeenAt: current?.firstSeenAt ?? ctx.now,
      lastSeenAt: ctx.now,
      removedAt: null,
    }
    plan.sections.push(section)
    plan.offers.push({ sectionId: section.id, reservedSeats })
  }
  return plan
}
