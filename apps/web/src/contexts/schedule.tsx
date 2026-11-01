import {
  getAllSchedules,
  saveCompletedSubjects,
  saveSchedule,
  deleteSchedule as dbDeleteSchedule,
  getCompletedSubjects,
} from '@/lib/indexeddb'
import type {
  ClassSection,
  ScheduledClass,
  ScheduledClassColor,
} from '@/types/class'
import type { Course, CurriculumStructure } from '@/types/course'
import type { Schedule } from '@/types/schedule'
import { checkTimeConflict } from '@/utils/check-time-conflict'
import { resolveLegacyScheduleCourse } from '@/utils/resolve-schedule-course'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
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

const DISCIPLINE_COLORS: ScheduledClassColor[] = [
  'red',
  'orange',
  'lime',
  'emerald',
  'teal',
  'cyan',
  'blue',
  'violet',
  'fuschia',
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
    .map((s) => ({
      ...s,
      year: s.year ?? DEFAULT_YEAR,
      semester: s.semester ?? DEFAULT_SEMESTER,
    }))

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

  const defaultSchedule: Schedule = {
    id: uuidv4(),
    courseId: course.id,
    courseSlug: course.slug,
    curriculumSlug: curriculum.slug,
    year,
    semester,
    name: 'Meu Cronograma',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    classes: [],
  }

  await saveSchedule(defaultSchedule)
  return {
    schedules: [...normalizedSchedules, defaultSchedule],
    termSchedules: [defaultSchedule],
    createdSchedule: defaultSchedule,
  }
}

type ScheduleContextData = {
  currentSchedule: Schedule | null
  completedSubjects: string[]
  schedules: Schedule[]
  isScheduleLoading: boolean
  scheduleClasses: ScheduledClass[]
  selectSchedule: (schedule: Schedule) => void
  toggleCompletedSubject: (subjectCode: string) => void
  toggleSubjectsCompleted: (subjectCodes: string[]) => void
  addClassToSchedule: (section: ClassSection) => void
  removeClassFromSchedule: (section: ScheduledClass) => void
  createSchedule: (name?: string) => Promise<void>
  deleteSchedule: (id: string) => Promise<void>
}

export const ScheduleContext = createContext<ScheduleContextData>(
  {} as ScheduleContextData,
)

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const { courses, selectedCourse, selectedCurriculum } = useCourse()
  const { currentYear, currentSemester } = useClass()

  const [allSchedules, setAllSchedules] = useState<Schedule[]>([])
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null)
  const [completedSubjects, setCompletedSubjects] = useState<string[]>([])
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  const activeYear = currentYear ?? DEFAULT_YEAR
  const activeSemester = currentSemester ?? DEFAULT_SEMESTER

  // Carregando enquanto as agendas do curso e semestre atuais não chegaram
  const scheduleKey =
    selectedCourse && selectedCurriculum
      ? `${selectedCourse.slug}/${selectedCurriculum.slug}/${activeYear}.${activeSemester}`
      : null
  const isScheduleLoading = scheduleKey !== null && loadedKey !== scheduleKey

  const schedules = useMemo(() => {
    return allSchedules.filter(
      (s) => s.year === activeYear && s.semester === activeSemester,
    )
  }, [allSchedules, activeYear, activeSemester])

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

    const scheduleName = name || `Agenda ${schedules.length + 1}`
    const newSchedule: Schedule = {
      id: uuidv4(),
      name: scheduleName,
      courseId: selectedCourse.id,
      courseSlug: selectedCourse.slug,
      curriculumSlug: selectedCurriculum.slug,
      year: activeYear,
      semester: activeSemester,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      classes: [],
    }

    await saveSchedule(newSchedule)
    setAllSchedules((prev) => [...prev, newSchedule])
    setCurrentSchedule(newSchedule)
  }

  const selectSchedule = (schedule: Schedule) => {
    setCurrentSchedule(schedule)
  }

  const updateCurrentSchedule = async (newClassses: ScheduledClass[]) => {
    if (!currentSchedule) return
    const updatedSchedule = {
      ...currentSchedule,
      classes: newClassses,
      updatedAt: Date.now(),
    }
    setAllSchedules((prev) =>
      prev.map((s) => (s.id === updatedSchedule.id ? updatedSchedule : s)),
    )
    setCurrentSchedule(updatedSchedule)
    await saveSchedule(updatedSchedule)
  }

  const scheduleClasses = currentSchedule?.classes || []

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

  const deleteSchedule = async (id: string) => {
    if (schedules.length <= 1) {
      toast.warning('Você não pode excluir a última agenda.')
      return
    }

    await dbDeleteSchedule(id)
    const remainingAll = allSchedules.filter((s) => s.id !== id)
    setAllSchedules(remainingAll)

    if (currentSchedule?.id === id) {
      const remainingFiltered = remainingAll.filter(
        (s) => s.year === activeYear && s.semester === activeSemester,
      )
      setCurrentSchedule(remainingFiltered[0] || null)
    }
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

    // Descarta o resultado se o curso ou o semestre mudarem antes dele chegar
    let cancelled = false
    void loadCourseSchedules({
      courses,
      course: selectedCourse,
      curriculum: selectedCurriculum,
      year: activeYear,
      semester: activeSemester,
    })
      .then((result) => {
        if (cancelled) return

        setAllSchedules(result.schedules)
        if (result.createdSchedule) {
          setCurrentSchedule(result.createdSchedule)
        } else {
          setCurrentSchedule((prev) => {
            const stillExists = result.termSchedules.find(
              (s) => s.id === prev?.id,
            )
            return stillExists ? prev : (result.termSchedules[0] ?? null)
          })
        }
      })
      .catch((error: unknown) => {
        console.error('Error initializing schedule context:', error)
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(scheduleKey)
      })

    return () => {
      cancelled = true
    }
  }, [
    scheduleKey,
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
    selectSchedule,
    toggleCompletedSubject,
    toggleSubjectsCompleted,
    addClassToSchedule,
    removeClassFromSchedule,
    createSchedule,
    deleteSchedule,
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
