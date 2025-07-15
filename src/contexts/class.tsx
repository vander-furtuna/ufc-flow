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
  changeYear: (year: number) => void
  changeSemester: (semester: number) => void
  getSubjectInformationByCode: (code: string) => SubjectGroup | null
}

export const ClassContext = createContext<ClassContextType>(
  {} as ClassContextType,
)

export function ClassProvider({ children }: { children: ReactNode }) {
  const { fetchScheduleData } = useScheduleManager()

  const [currentYear, setCurrentYear] = useState<number | null>(2025)
  const [currentSemester, setCurrentSemester] = useState<number | null>(1)

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

  useEffect(() => {
    // dispara sempre que ano, semestre ou a função de fetch mudarem
    fetchScheduleData(currentYear ?? 2025, currentSemester ?? 1).then((data) =>
      setCurrentClassGroup(data),
    )
  }, [currentYear, currentSemester])

  const value = useMemo(
    () => ({
      currentYear,
      currentSemester,
      currentClassGroup,
      changeYear,
      changeSemester,
      getSubjectInformationByCode,
    }),
    [
      currentYear,
      currentSemester,
      currentClassGroup,
      changeYear,
      changeSemester,
      getSubjectInformationByCode,
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
