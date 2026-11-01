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
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  const [currentClassGroup, setCurrentClassGroup] =
    useState<StorageClass | null>(null)

  // Carregando enquanto as turmas do curso e semestre atuais não chegaram
  const classGroupKey = selectedCourse
    ? `${selectedCourse.id}-${currentYear}-${currentSemester}`
    : null
  const isClassLoading =
    isRefreshing || (classGroupKey !== null && loadedKey !== classGroupKey)

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

  const handleRefreshSubjectInformations = useCallback(async () => {
    try {
      if (!selectedCourse) return
      setIsRefreshing(true)
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
      setIsRefreshing(false)
    }
  }, [refreshScheduleData, currentYear, currentSemester, selectedCourse])

  useEffect(() => {
    if (!selectedCourse || !classGroupKey) return

    // Descarta a resposta se o curso ou o semestre mudarem antes dela chegar
    let cancelled = false
    void fetchScheduleData(selectedCourse.id, currentYear, currentSemester)
      .catch((error: unknown) => {
        console.error('Error fetching schedule data:', error)
        return null
      })
      .then((data) => {
        if (cancelled) return
        setCurrentClassGroup(data)
        setLoadedKey(classGroupKey)
      })

    return () => {
      cancelled = true
    }
  }, [
    classGroupKey,
    currentYear,
    currentSemester,
    selectedCourse,
    fetchScheduleData,
  ])

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
