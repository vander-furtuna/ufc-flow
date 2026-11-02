import {
  getAllSchedules,
  saveCompletedSubjects,
  saveSchedule,
  deleteSchedule as dbDeleteSchedule,
  getCompletedSubjects,
} from '@/lib/indexeddb'
import { useSession } from '@/lib/auth/use-session'
import {
  deleteScheduleAction,
  listSchedulesAction,
  saveScheduleAction,
} from '@/lib/planning/schedule-actions'
import {
  fromScheduleView,
  normalizeLocalSchedule,
  toScheduleInput,
} from '@/lib/planning/schedule-mapper'
import type {
  ClassSection,
  ScheduledClass,
  ScheduledClassColor,
} from '@/types/class'
import type { Course, CurriculumStructure } from '@/types/course'
import type { Schedule } from '@/types/schedule'
import { checkTimeConflict } from '@/utils/check-time-conflict'
import { resolveLegacyScheduleCourse } from '@/utils/resolve-schedule-course'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'
import { useCourse } from './course'
import { useClass } from './class'

import { v4 as uuidv4 } from 'uuid'

const DEFAULT_YEAR = process.env.NEXT_PUBLIC_CURRENT_YEAR
  ? parseInt(process.env.NEXT_PUBLIC_CURRENT_YEAR)
  : new Date().getFullYear()

const DEFAULT_SEMESTER = process.env.NEXT_PUBLIC_CURRENT_SEMESTER
  ? parseInt(process.env.NEXT_PUBLIC_CURRENT_SEMESTER)
  : 2

const DEFAULT_SCHEDULE_NAME = 'Meu cronograma'

const DISCIPLINE_COLORS: ScheduledClassColor[] = [
  'red',
  'orange',
  'lime',
  'emerald',
  'teal',
  'cyan',
  'blue',
  'violet',
  'fuchsia',
  'pink',
  'rose',
]

type LoadCourseSchedulesParams = {
  courses: Course[]
  course: Course
  curriculum: CurriculumStructure
  year: number
  semester: number
}

type LoadCourseSchedulesResult = {
  // Agendas do curso e da EC, de todos os semestres
  schedules: Schedule[]
  // Agendas do semestre, da atualizada há mais tempo para a mais recente
  termSchedules: Schedule[]
  // Agenda padrão criada porque o semestre não tinha nenhuma
  createdSchedule: Schedule | null
}

function newSchedule(
  course: Course,
  curriculum: CurriculumStructure,
  year: number,
  semester: number,
  name: string,
): Schedule {
  return {
    id: uuidv4(),
    courseId: course.id,
    courseSlug: course.slug,
    curriculumSlug: curriculum.slug,
    year,
    semester,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    classes: [],
  }
}

async function loadCourseSchedules({
  courses,
  course,
  curriculum,
  year,
  semester,
}: LoadCourseSchedulesParams): Promise<LoadCourseSchedulesResult> {
  // Agendas antigas não guardavam o curso, só o id da estrutura curricular
  // (que se repete entre cursos). Atribui o curso e persiste.
  const storedSchedules = await getAllSchedules()
  const resolvedSchedules = await Promise.all(
    storedSchedules.map(async (schedule) => {
      if (schedule.courseSlug && schedule.curriculumSlug) return schedule

      const key = resolveLegacyScheduleCourse(schedule, courses, course.slug)
      if (!key) return schedule

      const migrated = { ...schedule, ...key }
      await saveSchedule(migrated)
      return migrated
    }),
  )

  const normalizedSchedules = resolvedSchedules
    .filter(
      (s) =>
        s.courseSlug === course.slug && s.curriculumSlug === curriculum.slug,
    )
    .map((s) =>
      normalizeLocalSchedule({
        ...s,
        year: s.year ?? DEFAULT_YEAR,
        semester: s.semester ?? DEFAULT_SEMESTER,
      }),
    )

  const termSchedules = normalizedSchedules
    .filter((s) => s.year === year && s.semester === semester)
    .sort((a, b) => a.updatedAt - b.updatedAt)

  if (termSchedules.length > 0) {
    return {
      schedules: normalizedSchedules,
      termSchedules,
      createdSchedule: null,
    }
  }

  const defaultSchedule = newSchedule(
    course,
    curriculum,
    year,
    semester,
    DEFAULT_SCHEDULE_NAME,
  )
  await saveSchedule(defaultSchedule)
  return {
    schedules: [...normalizedSchedules, defaultSchedule],
    termSchedules: [defaultSchedule],
    createdSchedule: defaultSchedule,
  }
}

// Logado: as agendas do curso, da EC e do semestre vêm da conta. Sem
// nenhuma, a agenda padrão fica só na tela até a primeira alteração.
async function loadAccountSchedules({
  course,
  curriculum,
  year,
  semester,
}: Omit<LoadCourseSchedulesParams, 'courses'>): Promise<{
  schedules: Schedule[]
  draft: Schedule | null
}> {
  const result = await listSchedulesAction({
    course: course.slug,
    curriculum: curriculum.slug,
    term: `${year}.${semester}`,
  })
  if (!result.ok) {
    throw new Error(result.problem.detail ?? 'Agendas indisponíveis')
  }
  const schedules = result.data.map((view) =>
    fromScheduleView(view, { courseId: course.id }),
  )
  if (schedules.length > 0) return { schedules, draft: null }
  const draft = newSchedule(
    course,
    curriculum,
    year,
    semester,
    DEFAULT_SCHEDULE_NAME,
  )
  return { schedules: [draft], draft }
}

export type ScheduleSyncState = {
  // local: IndexedDB (anônimo); account: conta, pela API
  mode: 'local' | 'account'
  status: 'idle' | 'saving' | 'error'
  lastSyncedAt: number | null
}

type ScheduleContextData = {
  currentSchedule: Schedule | null
  completedSubjects: string[]
  schedules: Schedule[]
  isScheduleLoading: boolean
  scheduleClasses: ScheduledClass[]
  sync: ScheduleSyncState
  selectSchedule: (schedule: Schedule) => void
  toggleCompletedSubject: (subjectCode: string) => void
  toggleSubjectsCompleted: (subjectCodes: string[]) => void
  addClassToSchedule: (section: ClassSection) => void
  removeClassFromSchedule: (section: ScheduledClass) => void
  // Dispensa o aviso de horário alterado de uma turma (só na conta)
  acknowledgeChange: (section: ScheduledClass) => void
  createSchedule: (name?: string) => Promise<void>
  deleteSchedule: (id: string) => Promise<void>
  // Relê as agendas (depois da importação, por exemplo)
  reloadSchedules: () => void
}

export const ScheduleContext = createContext<ScheduleContextData>(
  {} as ScheduleContextData,
)

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const { courses, selectedCourse, selectedCurriculum } = useCourse()
  const { currentYear, currentSemester, currentClassGroup } = useClass()
  const { data: user, isPending: isSessionPending } = useSession()
  const mode: ScheduleSyncState['mode'] = user ? 'account' : 'local'

  const [allSchedules, setAllSchedules] = useState<Schedule[]>([])
  const [currentScheduleId, setCurrentScheduleId] = useState<string | null>(
    null,
  )
  const [completedSubjects, setCompletedSubjects] = useState<string[]>([])
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [sync, setSync] = useState<Omit<ScheduleSyncState, 'mode'>>({
    status: 'idle',
    lastSyncedAt: null,
  })
  // Agenda padrão da conta que ainda não foi gravada
  const drafts = useRef(new Set<string>())
  // Só a resposta da última gravação de cada agenda substitui a tela
  const writeSeq = useRef(new Map<string, number>())

  const activeYear = currentYear ?? DEFAULT_YEAR
  const activeSemester = currentSemester ?? DEFAULT_SEMESTER

  // Carregando enquanto as agendas do curso e semestre atuais não chegaram
  const scheduleKey =
    selectedCourse && selectedCurriculum && !isSessionPending
      ? `${mode}:${selectedCourse.slug}/${selectedCurriculum.slug}/${activeYear}.${activeSemester}#${reloadToken}`
      : null
  const isScheduleLoading =
    isSessionPending || (scheduleKey !== null && loadedKey !== scheduleKey)

  const schedules = useMemo(() => {
    return allSchedules.filter(
      (s) => s.year === activeYear && s.semester === activeSemester,
    )
  }, [allSchedules, activeYear, activeSemester])

  const currentSchedule =
    schedules.find((s) => s.id === currentScheduleId) ?? schedules[0] ?? null

  // A agenda da conta não traz as vagas reservadas: vêm das turmas do curso
  const seatsById = useMemo(
    () =>
      new Map(
        (currentClassGroup?.classGroup ?? []).flatMap((group) =>
          group.classes.map((cls) => [cls.id, cls.reservedSeats] as const),
        ),
      ),
    [currentClassGroup],
  )
  const scheduleClasses = useMemo(
    () =>
      (currentSchedule?.classes ?? []).map((cls) =>
        cls.reservedSeats || !seatsById.has(cls.id)
          ? cls
          : { ...cls, reservedSeats: seatsById.get(cls.id)! },
      ),
    [currentSchedule, seatsById],
  )

  const replaceSchedule = (schedule: Schedule) =>
    setAllSchedules((prev) =>
      prev.map((s) => (s.id === schedule.id ? schedule : s)),
    )

  // Grava na conta; se a API recusar, a agenda volta a ser como era
  const persistToAccount = async (
    schedule: Schedule,
    previous: Schedule,
    acknowledged?: ReadonlySet<string>,
  ) => {
    const seq = (writeSeq.current.get(schedule.id) ?? 0) + 1
    writeSeq.current.set(schedule.id, seq)
    setSync((prev) => ({ ...prev, status: 'saving' }))
    const position = Math.max(
      0,
      schedules.findIndex((s) => s.id === schedule.id),
    )
    const result = await saveScheduleAction(
      schedule.id,
      toScheduleInput(schedule, position, acknowledged),
    )
    const latest = writeSeq.current.get(schedule.id) === seq
    if (result.ok) {
      drafts.current.delete(schedule.id)
      setSync({ status: 'idle', lastSyncedAt: Date.now() })
      if (latest) {
        replaceSchedule(
          fromScheduleView(result.data, { courseId: schedule.courseId }),
        )
      }
      return
    }
    setSync((prev) => ({ ...prev, status: 'error' }))
    if (latest) replaceSchedule(previous)
    toast.error('Não foi possível salvar na sua conta', {
      description:
        result.problem.code === 'SCHEDULE_SECTION_NOT_FOUND'
          ? 'As turmas deste semestre ainda não foram coletadas pelo Flow. Tente de novo mais tarde.'
          : result.problem.detail,
    })
  }

  const updateCurrentSchedule = async (
    newClasses: ScheduledClass[],
    acknowledged?: ReadonlySet<string>,
  ) => {
    if (!currentSchedule) return
    const updatedSchedule = {
      ...currentSchedule,
      classes: newClasses,
      updatedAt: Date.now(),
    }
    replaceSchedule(updatedSchedule)
    if (mode === 'account') {
      await persistToAccount(updatedSchedule, currentSchedule, acknowledged)
    } else {
      await saveSchedule(updatedSchedule)
    }
  }

  const toggleCompletedSubject = async (subjectCode: string) => {
    const isNowCompleted = !completedSubjects.includes(subjectCode)

    if (isNowCompleted) {
      // Check if this subject is currently in the plan
      const conflictingClass = scheduleClasses.find(
        (p) => p.code === subjectCode,
      )
      if (conflictingClass) {
        const newClasses = scheduleClasses.filter(
          (c) => c.id !== conflictingClass.id,
        )
        await updateCurrentSchedule(newClasses)
        toast.info('Disciplina removida da agenda', {
          description: `"${conflictingClass.name}" foi marcada como concluída.`,
        })
      }
    }

    const newSubjects = isNowCompleted
      ? [...completedSubjects, subjectCode]
      : completedSubjects.filter((c) => c !== subjectCode)

    setCompletedSubjects(newSubjects)
    await saveCompletedSubjects(newSubjects)
  }

  const toggleSubjectsCompleted = async (subjectCodes: string[]) => {
    if (subjectCodes.length === 0) return

    const areAllCompleted = subjectCodes.every((code) =>
      completedSubjects.includes(code),
    )

    let newSubjects: string[]
    if (areAllCompleted) {
      newSubjects = completedSubjects.filter(
        (code) => !subjectCodes.includes(code),
      )
    } else {
      const toAdd = subjectCodes.filter(
        (code) => !completedSubjects.includes(code),
      )
      newSubjects = [...completedSubjects, ...toAdd]

      const conflictingClasses = scheduleClasses.filter((p) =>
        toAdd.includes(p.code),
      )

      if (conflictingClasses.length > 0) {
        const conflictingIds = new Set(conflictingClasses.map((c) => c.id))
        const newClasses = scheduleClasses.filter(
          (c) => !conflictingIds.has(c.id),
        )
        await updateCurrentSchedule(newClasses)
        toast.info('Disciplinas removidas da agenda', {
          description: `${conflictingClasses.length} disciplina(s) marcada(s) como concluída(s) foram removida(s) da agenda.`,
        })
      }
    }

    setCompletedSubjects(newSubjects)
    await saveCompletedSubjects(newSubjects)
  }

  const createSchedule = async (name?: string) => {
    if (!selectedCourse || !selectedCurriculum) {
      toast.error('Selecione um curso antes de criar uma agenda.')
      return
    }

    const created = newSchedule(
      selectedCourse,
      selectedCurriculum,
      activeYear,
      activeSemester,
      name || `Agenda ${schedules.length + 1}`,
    )
    const previousId = currentSchedule?.id ?? null
    setAllSchedules((prev) => [...prev, created])
    setCurrentScheduleId(created.id)

    if (mode === 'local') {
      await saveSchedule(created)
      return
    }
    setSync((prev) => ({ ...prev, status: 'saving' }))
    const result = await saveScheduleAction(
      created.id,
      toScheduleInput(created, schedules.length),
    )
    if (result.ok) {
      setSync({ status: 'idle', lastSyncedAt: Date.now() })
      return
    }
    setSync((prev) => ({ ...prev, status: 'error' }))
    setAllSchedules((prev) => prev.filter((s) => s.id !== created.id))
    setCurrentScheduleId(previousId)
    toast.error('Não foi possível criar a agenda', {
      description: result.problem.detail,
    })
  }

  const selectSchedule = (schedule: Schedule) => {
    setCurrentScheduleId(schedule.id)
  }

  const addClassToSchedule = (section: ClassSection) => {
    const existingClassForSubject = scheduleClasses.find(
      (c) => c.code === section.code,
    )
    const otherClasses = scheduleClasses.filter((c) => c.code !== section.code)

    const conflicts = checkTimeConflict(section, otherClasses)
    if (conflicts.length > 0) {
      toast.error(
        `Conflito de horário com ${conflicts.map((c) => c.name).join(', ')}`,
      )
      return
    }

    const usedColors = otherClasses
      .map((c) => c.color)
      .filter(Boolean) as ScheduledClassColor[]
    const availableColors = DISCIPLINE_COLORS.filter(
      (c) => !usedColors.includes(c),
    )
    const newColor =
      existingClassForSubject?.color ||
      (availableColors.length > 0
        ? availableColors[Math.floor(Math.random() * availableColors.length)]
        : DISCIPLINE_COLORS[
            Math.floor(Math.random() * DISCIPLINE_COLORS.length)
          ])

    const newClasses = [...otherClasses, { ...section, color: newColor }]
    void updateCurrentSchedule(newClasses)
  }

  const removeClassFromSchedule = (section: ScheduledClass) => {
    const newClasses = scheduleClasses.filter((cls) => cls.id !== section.id)
    void updateCurrentSchedule(newClasses)
  }

  const acknowledgeChange = (section: ScheduledClass) => {
    if (mode !== 'account') return
    const newClasses = scheduleClasses.map((cls) =>
      cls.id === section.id ? { ...cls, changed: false } : cls,
    )
    void updateCurrentSchedule(newClasses, new Set([section.id]))
  }

  const deleteSchedule = async (id: string) => {
    if (schedules.length <= 1) {
      toast.warning('Você não pode excluir a última agenda.')
      return
    }

    const removed = allSchedules.find((s) => s.id === id)
    setAllSchedules((prev) => prev.filter((s) => s.id !== id))
    if (currentSchedule?.id === id) setCurrentScheduleId(null)

    if (mode === 'local') {
      await dbDeleteSchedule(id)
      return
    }
    if (drafts.current.delete(id)) return
    const result = await deleteScheduleAction(id)
    if (result.ok || result.problem.code === 'SCHEDULE_NOT_FOUND') return
    if (removed) setAllSchedules((prev) => [...prev, removed])
    toast.error('Não foi possível excluir a agenda', {
      description: result.problem.detail,
    })
  }

  useEffect(() => {
    const initGlobal = async () => {
      try {
        const savedSubjects = await getCompletedSubjects()
        setCompletedSubjects(savedSubjects)
      } catch (error) {
        console.error('Failed to initialize global prefs:', error)
      }
    }
    void initGlobal()
  }, [])

  useEffect(() => {
    if (!selectedCourse || !selectedCurriculum || !scheduleKey) return

    // Descarta o resultado se o curso, o semestre ou a sessão mudarem antes
    // dele chegar
    let cancelled = false
    const params = {
      course: selectedCourse,
      curriculum: selectedCurriculum,
      year: activeYear,
      semester: activeSemester,
    }
    const load =
      mode === 'account'
        ? loadAccountSchedules(params).then(({ schedules: loaded, draft }) => {
            if (cancelled) return
            drafts.current = new Set(draft ? [draft.id] : [])
            setAllSchedules(loaded)
            setSync({ status: 'idle', lastSyncedAt: Date.now() })
            setCurrentScheduleId((prev) =>
              loaded.some((s) => s.id === prev) ? prev : null,
            )
          })
        : loadCourseSchedules({ ...params, courses }).then((result) => {
            if (cancelled) return
            setAllSchedules(result.schedules)
            setSync({ status: 'idle', lastSyncedAt: null })
            setCurrentScheduleId((prev) =>
              result.createdSchedule
                ? result.createdSchedule.id
                : result.termSchedules.some((s) => s.id === prev)
                  ? prev
                  : null,
            )
          })

    void load
      .catch((error: unknown) => {
        console.error('Error initializing schedule context:', error)
        if (cancelled || mode !== 'account') return
        setAllSchedules([])
        setSync((prev) => ({ ...prev, status: 'error' }))
        toast.error('Não foi possível carregar as agendas da sua conta')
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(scheduleKey)
      })

    return () => {
      cancelled = true
    }
  }, [
    scheduleKey,
    mode,
    courses,
    selectedCourse,
    selectedCurriculum,
    activeYear,
    activeSemester,
  ])

  const value = {
    schedules,
    currentSchedule,
    completedSubjects,
    isScheduleLoading,
    scheduleClasses,
    sync: { mode, ...sync },
    selectSchedule,
    toggleCompletedSubject,
    toggleSubjectsCompleted,
    addClassToSchedule,
    removeClassFromSchedule,
    acknowledgeChange,
    createSchedule,
    deleteSchedule,
    reloadSchedules: () => setReloadToken((token) => token + 1),
  }

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  )
}

export function useSchedule() {
  const context = useContext(ScheduleContext)

  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider')
  }

  return context
}
