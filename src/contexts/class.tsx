'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { getClassesInformationsService } from '@/services/scrapping/get-classes-informations'
import {
  getClassesFromStorage,
  saveClassesInStorage,
} from '@/storage/classes/local-storage'
import type { CourseGroup } from '@/utils/get-subjects-informations'

type ClassContextType = {}

export type StorageClass = {
  year: number
  semester: number
  classGroup: CourseGroup[]
}

export const ClassContext = createContext<ClassContextType>(
  {} as ClassContextType,
)

export function ClassProvider({ children }: { children: ReactNode }) {
  const [currentSemesterYear, setCurrentSemesterYear] = useState<number | null>(
    2025,
  )
  const [currentSemester, setCurrentSemester] = useState<number | null>(1)

  const [classes, setClasses] = useState<StorageClass[]>([])

  const handleGetClasses = useCallback(async () => {
    const storedClasses = getClassesFromStorage()

    if (storedClasses.length > 0) {
      setClasses(storedClasses)
      console.log('Classes fetched from storage:', storedClasses)
    } else {
      if (currentSemesterYear && currentSemester) {
        const classesData = await getClassesInformationsService({
          year: currentSemesterYear,
          semester: currentSemester,
        })

        const formattedClasses = {
          year: currentSemesterYear,
          semester: currentSemester,
          classGroup: classesData,
        } as StorageClass

        setClasses([formattedClasses])

        saveClassesInStorage([formattedClasses])

        console.log('Classes fetched from API:', formattedClasses)
      }
    }
  }, [currentSemester, currentSemesterYear])

  useEffect(() => {
    if (typeof window === 'undefined') return
    handleGetClasses()
  }, [handleGetClasses])

  const value = useMemo(() => ({}), [])

  return <ClassContext.Provider value={value}>{children}</ClassContext.Provider>
}
