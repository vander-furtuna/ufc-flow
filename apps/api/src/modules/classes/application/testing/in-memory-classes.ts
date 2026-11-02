import type {
  ClassesRepositories,
  ClassesUnitOfWork,
  CourseRef,
  ScrapeRunRecord,
  SigaaSectionSource,
} from '../../domain/ports'
import type { ScrapedSection, SectionRecord } from '../../domain/section'
import type { AcademicTerm } from '../../domain/term'

const clone = <T>(value: T): T => structuredClone(value)

// Portas em memória, para testar os casos de uso sem banco
export class InMemoryClasses implements ClassesUnitOfWork {
  terms = new Map<string, AcademicTerm>()
  sections = new Map<string, SectionRecord>()
  // termId|courseId|sectionId -> vagas
  offers = new Map<
    string,
    {
      termId: string
      courseId: string
      sectionId: string
      reservedSeats: number
    }
  >()
  courses: CourseRef[] = []
  runs = new Map<string, ScrapeRunRecord>()

  readonly repositories: ClassesRepositories = {
    terms: {
      list: async () => [...this.terms.values()].map(clone),
      findByCode: async (code) =>
        clone(
          [...this.terms.values()].find((term) => term.code === code) ?? null,
        ),
      findCurrent: async () =>
        clone([...this.terms.values()].find((term) => term.isCurrent) ?? null),
      insert: async (term) => {
        this.terms.set(term.id, clone(term))
      },
      update: async (term) => {
        this.terms.set(term.id, clone(term))
      },
      delete: async (id) => {
        this.terms.delete(id)
      },
      setCurrent: async (id) => {
        for (const [key, term] of this.terms) {
          this.terms.set(key, { ...term, isCurrent: key === id })
        }
      },
      hasSections: async (termId) =>
        [...this.sections.values()].some(
          (section) => section.termId === termId,
        ),
    },
    sections: {
      findByKeys: async (termId, keys) =>
        [...this.sections.values()]
          .filter(
            (section) =>
              section.termId === termId &&
              keys.some(
                (key) =>
                  key.subjectCode === section.subjectCode &&
                  key.sectionCode === section.sectionCode,
              ),
          )
          .map(clone),
      saveAll: async (sections) => {
        for (const section of sections)
          this.sections.set(section.id, clone(section))
      },
      replaceOffers: async (termId, courseId, offers) => {
        for (const [key, offer] of this.offers) {
          if (offer.termId === termId && offer.courseId === courseId)
            this.offers.delete(key)
        }
        for (const offer of offers) {
          this.offers.set(`${termId}|${courseId}|${offer.sectionId}`, {
            termId,
            courseId,
            ...offer,
          })
        }
      },
      markOrphansRemoved: async (termId, now) => {
        let count = 0
        for (const [id, section] of this.sections) {
          const offered = [...this.offers.values()].some(
            (offer) => offer.sectionId === id,
          )
          if (
            section.termId === termId &&
            !offered &&
            section.removedAt === null
          ) {
            this.sections.set(id, { ...section, removedAt: now })
            count++
          }
        }
        return count
      },
      listOffered: async (termId, courseId) =>
        [...this.offers.values()]
          .filter(
            (offer) => offer.termId === termId && offer.courseId === courseId,
          )
          .flatMap((offer) => {
            const section = this.sections.get(offer.sectionId)
            return section && section.removedAt === null
              ? [{ ...clone(section), reservedSeats: offer.reservedSeats }]
              : []
          }),
    },
    courses: {
      findBySlug: async (slug) =>
        this.courses.find((course) => course.slug === slug) ?? null,
      listActive: async () => this.courses.filter((course) => course.isActive),
    },
    runs: {
      insert: async (run) => {
        this.runs.set(run.id, clone(run))
      },
      update: async (run) => {
        this.runs.set(run.id, clone(run))
      },
      lastSuccess: async (courseId, termId) =>
        [...this.runs.values()]
          .filter(
            (run) =>
              run.courseId === courseId &&
              run.termId === termId &&
              run.status === 'SUCCESS',
          )
          .map((run) => run.finishedAt as Date)
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
    },
  }

  run<T>(work: (repositories: ClassesRepositories) => Promise<T>): Promise<T> {
    return work(this.repositories)
  }
}

// Fonte do SIGAA programável: por curso, a lista ou um erro
export class FakeSectionSource implements SigaaSectionSource {
  responses = new Map<string, ScrapedSection[] | Error>()
  calls: string[] = []

  async fetch(sigaaCourseId: string, year: number, period: number) {
    this.calls.push(`${sigaaCourseId}@${year}.${period}`)
    const response = this.responses.get(sigaaCourseId) ?? []
    if (response instanceof Error) throw response
    return structuredClone(response)
  }
}
