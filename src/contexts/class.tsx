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
  const { fetchScheduleData, refreshScheduleData } = useScheduleManager()

  const [currentYear, setCurrentYear] = useState<number>(2025)
  const [currentSemester, setCurrentSemester] = useState<number>(1)
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
    async (year: number, semester: number) => {
      try {
        setIsClassLoading(true)
        const data = await fetchScheduleData(year, semester)
        setCurrentClassGroup(data)
      } catch (error) {
        console.error('Error fetching schedule data:', error)
        setCurrentClassGroup(null)
      } finally {
        setIsClassLoading(false)
      }
    },
    [fetchScheduleData],
  )

  const handleRefreshSubjectInformations = useCallback(async () => {
    try {
      setIsClassLoading(true)
      const data = await refreshScheduleData(currentYear, currentSemester)
      setCurrentClassGroup(data)
    } catch (error) {
      console.error('Error refreshing schedule data:', error)
      setCurrentClassGroup(null)
    } finally {
      setIsClassLoading(false)
    }
  }, [refreshScheduleData, currentYear, currentSemester])

  useEffect(() => {
    // dispara sempre que ano, semestre ou a função de fetch mudarem
    handleFetchScheduleData(currentYear, currentSemester)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear, currentSemester])

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
