import {
  getSchedulesByCourse,
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
import type { Schedule } from '@/types/schedule'
import { checkTimeConflict } from '@/utils/check-time-conflict'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { toast } from 'sonner'
import { useCourse } from './course'

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

type ScheduleContextData = {
  currentSchedule: Schedule | null
  completedSubjects: string[]
  schedules: Schedule[]
  isScheduleLoading: boolean
  scheduleClasses: ScheduledClass[]
  selectSchedule: (schedule: Schedule) => void
  toggleCompletedSubject: (subjectCode: string) => void
  addClassToSchedule: (section: ClassSection) => void
  removeClassFromSchedule: (section: ScheduledClass) => void
  createSchedule: (name?: string) => Promise<void>
  deleteSchedule: (id: string) => Promise<void>
}

export const ScheduleContext = createContext<ScheduleContextData>(
  {} as ScheduleContextData,
)

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const { selectedCurriculum } = useCourse()

  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null)
  const [completedSubjects, setCompletedSubjects] = useState<string[]>([])
  const [isScheduleLoading, setIsScheduleLoading] = useState<boolean>(true)

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

  const createSchedule = async (
    name: string = `Agenda ${schedules.length + 1}`,
  ) => {
    const newSchedule: Schedule = {
      id: crypto.randomUUID(),
      name,
      courseId: selectedCurriculum?.id || 'unknown',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      classes: [],
    }

    await saveSchedule(newSchedule)
    setSchedules((prev) => [...prev, newSchedule])
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
    setSchedules((prev) =>
      prev.map((s) => (s.id === updatedSchedule.id ? updatedSchedule : s)),
    )
    setCurrentSchedule(updatedSchedule)
    await saveSchedule(updatedSchedule)
  }

  const scheduleClasses = currentSchedule?.classes || []

  const addClassToSchedule = (section: ClassSection) => {
    console.log('Adding class to schedule:', section)
    const conflicts = checkTimeConflict(section, scheduleClasses)
    if (conflicts.length > 0) {
      alert(
        `Conflito de horário com ${conflicts.map((c) => c.name).join(', ')}`,
      )
      return
    }

    const usedColors = scheduleClasses
      .map((c) => c.color)
      .filter(Boolean) as ScheduledClassColor[]
    const availableColors = DISCIPLINE_COLORS.filter(
      (c) => !usedColors.includes(c),
    )
    const newColor =
      availableColors.length > 0
        ? availableColors[Math.floor(Math.random() * availableColors.length)]
        : DISCIPLINE_COLORS[
            Math.floor(Math.random() * DISCIPLINE_COLORS.length)
          ]

    const newClasses = [...scheduleClasses, { ...section, color: newColor }]
    updateCurrentSchedule(newClasses)
  }

  const removeClassFromSchedule = (section: ScheduledClass) => {
    const newClasses = scheduleClasses.filter((cls) => cls.id !== section.id)
    updateCurrentSchedule(newClasses)
  }

  const deleteSchedule = async (id: string) => {
    if (schedules.length <= 1) {
      toast.warning('Você não pode excluir a última agenda.')
      return
    }

    await dbDeleteSchedule(id)
    const remaining = schedules.filter((s) => s.id !== id)
    setSchedules(remaining)

    if (currentSchedule?.id === id) {
      setCurrentSchedule(remaining[0])
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
    initGlobal()
  }, [])

  const init = useCallback(async () => {
    try {
      setIsScheduleLoading(true)

      if (!selectedCurriculum) {
        console.warn('No curriculum selected, skipping schedule init.')
        return
      }

      const savedSchedules = await getSchedulesByCourse(selectedCurriculum?.id)

      if (savedSchedules.length === 0) {
        const defaultSchedule: Schedule = {
          id: 'default',
          courseId: selectedCurriculum.id,
          name: 'Meu Cronograma',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          classes: [],
        }

        await saveSchedule(defaultSchedule)
        setSchedules([defaultSchedule])
        setCurrentSchedule(defaultSchedule)
      } else {
        const sortedSchedules = savedSchedules.sort(
          (a, b) => a.updatedAt - b.updatedAt,
        )

        setSchedules(sortedSchedules)
        setCurrentSchedule((prev) => {
          const stillExists = sortedSchedules.find((s) => s.id === prev?.id)
          return stillExists ? prev : sortedSchedules[0]
        })
      }
    } catch (error) {
      console.error('Error initializing schedule context:', error)
    } finally {
      setIsScheduleLoading(false)
    }
  }, [selectedCurriculum])

  useEffect(() => {
    init()
  }, [init])

  console.log('Schedules:', schedules)

  const value = {
    schedules,
    currentSchedule,
    completedSubjects,
    isScheduleLoading,
    scheduleClasses,
    selectSchedule,
    toggleCompletedSubject,
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
