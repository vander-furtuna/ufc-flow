'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useScheduleManager } from '@/lib/indexeddb'
import type { StorageClass, SubjectGroup } from '@/types/class'
import { useCourse } from './course'

type ClassContextType = {
  currentYear: number | null
  currentSemester: number | null
  currentClassGroup: StorageClass | null
  isClassLoading: boolean
  changeYear: (year: number) => void
  changeSemester: (semester: number) => void
  getSubjectInformationByCode: (code: string) => SubjectGroup | null
  handleRefreshSubjectInformations: () => void
}

export const ClassContext = createContext<ClassContextType>(
  {} as ClassContextType,
)

export function ClassProvider({ children }: { children: ReactNode }) {
  const { selectedCourse } = useCourse()
  const { fetchScheduleData, refreshScheduleData } = useScheduleManager()

  const [currentYear, setCurrentYear] = useState<number>(
    process.env.NEXT_PUBLIC_CURRENT_YEAR
      ? parseInt(process.env.NEXT_PUBLIC_CURRENT_YEAR)
      : new Date().getFullYear(),
  )
  const [currentSemester, setCurrentSemester] = useState<number>(
    process.env.NEXT_PUBLIC_CURRENT_SEMESTER
      ? parseInt(process.env.NEXT_PUBLIC_CURRENT_SEMESTER)
      : 2,
  )
  const [isClassLoading, setIsClassLoading] = useState<boolean>(false)

  const [currentClassGroup, setCurrentClassGroup] =
    useState<StorageClass | null>(null)

  // const handleSaveScheduleData = useCallback(async () => {
  //   const data = await fetchScheduleData(
  //     currentYear ?? 2025,
  //     currentSemester ?? 1,
  //   )

  //   setCurrentClassGroup(data)
  // }, [currentSemester, currentYear, fetchScheduleData])

  const changeYear = useCallback((year: number) => {
    setCurrentYear(year)
  }, [])

  const changeSemester = useCallback((semester: number) => {
    setCurrentSemester(semester)
  }, [])

  const getSubjectInformationByCode = useCallback(
    (code: string) => {
      if (currentClassGroup) {
        const subject = currentClassGroup.classGroup.find(
          (subject) => subject.code === code,
        )

        return subject ?? null
      }
      return null
    },
    [currentClassGroup],
  )

  const handleFetchScheduleData = useCallback(
    async (courseId: string, year: number, semester: number) => {
      try {
        if (!selectedCourse) return
        setIsClassLoading(true)
        const data = await fetchScheduleData(courseId, year, semester)
        setCurrentClassGroup(data)
      } catch (error) {
        console.error('Error fetching schedule data:', error)
        setCurrentClassGroup(null)
      } finally {
        setIsClassLoading(false)
      }
    },
    [fetchScheduleData, selectedCourse],
  )

  const handleRefreshSubjectInformations = useCallback(async () => {
    try {
      if (!selectedCourse) return
      setIsClassLoading(true)
      const data = await refreshScheduleData(
        selectedCourse.id,
        currentYear,
        currentSemester,
      )
      setCurrentClassGroup(data)
    } catch (error) {
      console.error('Error refreshing schedule data:', error)
      setCurrentClassGroup(null)
    } finally {
      setIsClassLoading(false)
    }
  }, [refreshScheduleData, currentYear, currentSemester, selectedCourse])

  useEffect(() => {
    handleFetchScheduleData(
      selectedCourse?.id ?? '',
      currentYear,
      currentSemester,
    )
  }, [currentYear, currentSemester, selectedCourse, handleFetchScheduleData])

  const value = useMemo(
    () => ({
      currentYear,
      currentSemester,
      currentClassGroup,
      isClassLoading,
      changeYear,
      changeSemester,
      getSubjectInformationByCode,
      handleRefreshSubjectInformations,
    }),
    [
      currentYear,
      currentSemester,
      currentClassGroup,
      isClassLoading,
      changeYear,
      changeSemester,
      getSubjectInformationByCode,
      handleRefreshSubjectInformations,
    ],
  )

  return <ClassContext.Provider value={value}>{children}</ClassContext.Provider>
}

export function useClass() {
  const context = useContext(ClassContext)
  if (!context) {
    throw new Error('useClass must be used within a ClassProvider')
  }
  return context
}
