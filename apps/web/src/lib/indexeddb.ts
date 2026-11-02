// lib/indexeddb.ts
import type { IDBPDatabase } from 'idb'
import { useCallback } from 'react'

import { STORES, getUfcFlowDb } from './ufc-flow-db'
import { getClassesInformationsService } from '@/services/scrapping/get-classes-informations'
// Supondo que você tenha um serviço para o calendário (exemplo)
// Caso seja um fetch direto, você pode adaptar dentro do useCalendarManager
import type { StorageClass, SubjectGroup } from '@/types/class'
import type { Schedule } from '@/types/schedule'
// Importe o tipo MonthGroup definido anteriormente
import type { MonthGroup } from '@/types/calendar'
import { getCalendarService } from '@/services/scrapping/get-calendar-service'
import { normalizeWords } from '@/utils/normalize-words'
import type { RUMenuDay, RUMenuWeek } from '@/types/ru'

// Stores do banco (abertura e versões em ./ufc-flow-db)
const STORE_NAME = STORES.classes
const STORE_USER_AGENDAS = STORES.userSchedules
const STORE_USER_PREFERENCES = STORES.userPreferences
const STORE_CALENDAR = STORES.academicCalendar
const STORE_RU = STORES.ruMenus // Store de Cardápio do RU

const importantTerms = ['matricula', 'ira']

// Chave primária composta: courseId-year-semester
const generateKey = (courseId: string, year: number, semester: number) =>
  `${courseId}-${year}-${semester}`

class IndexedDBStorage {
  private db: IDBPDatabase | null = null

  // Inicializa o banco de dados
  async init(): Promise<void> {
    if (this.db) return
    this.db = await getUfcFlowDb()
  }

  async getSchedulesByCourse(courseId: string): Promise<Schedule[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    // Usa o índice para buscar apenas agendas do curso específico
    return this.db.getAllFromIndex(STORE_USER_AGENDAS, 'courseId', courseId)
  }

  async getAllSchedules(): Promise<Schedule[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')
    return this.db.getAll(STORE_USER_AGENDAS)
  }

  async saveSchedule(schedule: Schedule): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')
    await this.db.put(STORE_USER_AGENDAS, schedule)
  }

  async deleteSchedule(id: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')
    await this.db.delete(STORE_USER_AGENDAS, id)
  }

  async getCompletedSubjects(): Promise<string[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')
    const result = await this.db.get(
      STORE_USER_PREFERENCES,
      'completedSubjects',
    )
    return result?.value || []
  }

  async saveCompletedSubjects(subjects: string[]): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')
    await this.db.put(STORE_USER_PREFERENCES, {
      key: 'completedSubjects',
      value: subjects,
    })
  }

  // Salva ou atualiza dados de um período específico de um curso
  async saveScheduleData(courseId: string, data: StorageClass): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const key = generateKey(courseId, data.year, data.semester)
    const record = {
      id: key,
      courseId,
      ...data,
      updatedAt: new Date().toISOString(),
    }

    const tx = this.db.transaction(STORE_NAME, 'readwrite')
    await tx.store.put(record)
    await tx.done
  }

  // Busca dados de um período específico de um curso
  async getScheduleData(
    courseId: string,
    year: number,
    semester: number,
  ): Promise<StorageClass | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const key = generateKey(courseId, year, semester)
    const record = await this.db.get(STORE_NAME, key)

    if (!record) return null

    // Remove campos internos antes de retornar
    const { id, updatedAt, courseId: _, ...scheduleData } = record
    return scheduleData as StorageClass
  }

  // Busca todos os dados salvos de um curso específico
  async getAllScheduleDataByCourse(courseId: string): Promise<StorageClass[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const tx = this.db.transaction(STORE_NAME, 'readonly')
    const index = tx.store.index('courseId')
    const records = await index.getAll(courseId)

    return records.map((record) => {
      const { id, updatedAt, courseId: _, ...scheduleData } = record
      return scheduleData as StorageClass
    })
  }

  // Busca todos os dados salvos (todos os cursos)
  async getAllScheduleData(): Promise<
    Array<StorageClass & { courseId: string }>
  > {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const records = await this.db.getAll(STORE_NAME)

    return records.map((record) => {
      const { id, updatedAt, ...scheduleData } = record
      return scheduleData as StorageClass & { courseId: string }
    })
  }

  // Verifica se existe dados para um período de um curso
  async hasScheduleData(
    courseId: string,
    year: number,
    semester: number,
  ): Promise<boolean> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const key = generateKey(courseId, year, semester)
    const record = await this.db.get(STORE_NAME, key)
    return !!record
  }

  // Remove dados de um período específico de um curso
  async removeScheduleData(
    courseId: string,
    year: number,
    semester: number,
  ): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const key = generateKey(courseId, year, semester)
    await this.db.delete(STORE_NAME, key)
  }

  // Remove todos os dados de um curso específico
  async removeAllCourseData(courseId: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const tx = this.db.transaction(STORE_NAME, 'readwrite')
    const index = tx.store.index('courseId')
    const keys = await index.getAllKeys(courseId)

    for (const key of keys) {
      await tx.store.delete(key)
    }

    await tx.done
  }

  // Limpa todos os dados
  async clearAllData(): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    await this.db.clear(STORE_NAME)
  }

  // Busca dados de um curso por ano
  async getSchedulesByCourseAndYear(
    courseId: string,
    year: number,
  ): Promise<StorageClass[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const tx = this.db.transaction(STORE_NAME, 'readonly')
    const index = tx.store.index('courseYear')
    const records = await index.getAll([courseId, year])

    return records.map((record) => {
      const { id, updatedAt, courseId: _, ...scheduleData } = record
      return scheduleData as StorageClass
    })
  }

  // Obtém informações sobre quando os dados foram atualizados
  async getLastUpdateTime(
    courseId: string,
    year: number,
    semester: number,
  ): Promise<Date | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const key = generateKey(courseId, year, semester)
    const record = await this.db.get(STORE_NAME, key)

    return record?.updatedAt ? new Date(record.updatedAt) : null
  }

  // Busca uma disciplina específica pelo código em um período de um curso
  async getCourseData(
    courseId: string,
    year: number,
    semester: number,
    courseCode: string,
  ): Promise<SubjectGroup | null> {
    const scheduleData = await this.getScheduleData(courseId, year, semester)
    if (!scheduleData) return null

    const course = scheduleData.classGroup.find((c) => c.code === courseCode)
    return course || null
  }

  // --- NOVAS FUNÇÕES DO CALENDÁRIO ---

  async saveCalendar(year: number, data: MonthGroup[]): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    await this.db.put(STORE_CALENDAR, {
      year,
      data,
      updatedAt: new Date().toISOString(),
    })
  }

  async getCalendar(year: number): Promise<MonthGroup[] | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const record = await this.db.get(STORE_CALENDAR, year)
    return record?.data || null
  }

  async getCalendarRecord(
    year: number,
  ): Promise<{ year: number; data: MonthGroup[]; updatedAt: string } | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const record = await this.db.get(STORE_CALENDAR, year)
    return (
      (record as { year: number; data: MonthGroup[]; updatedAt: string }) ||
      null
    )
  }

  async getCalendarLastUpdateTime(year: number): Promise<Date | null> {
    const record = await this.getCalendarRecord(year)
    return record?.updatedAt ? new Date(record.updatedAt) : null
  }

  async removeCalendar(year: number): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')
    await this.db.delete(STORE_CALENDAR, year)
  }

  // --- FUNÇÕES DO CARDÁPIO DO RU ---

  async saveRuMenu(menu: RUMenuDay): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    await this.db.put(STORE_RU, {
      ...menu,
      updatedAt: new Date().toISOString(),
    })
  }

  async getRuMenu(campusId: number, date: string): Promise<RUMenuDay | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const key = `${campusId}-${date}`
    const record = await this.db.get(STORE_RU, key)
    return (record as RUMenuDay) || null
  }

  async saveRuMenuWeek(week: RUMenuWeek): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const now = new Date().toISOString()
    const tx = this.db.transaction(STORE_RU, 'readwrite')

    // Salva o resumo da semana
    await tx.store.put({
      ...week,
      updatedAt: now,
    })

    // Salva também cada dia da semana individualmente
    for (const day of week.days) {
      await tx.store.put({
        ...day,
        updatedAt: now,
      })
    }

    await tx.done
  }

  async getRuMenuWeek(
    campusId: number,
    weekStartDate: string,
  ): Promise<RUMenuWeek | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const key = `${campusId}-week-${weekStartDate}`
    const record = await this.db.get(STORE_RU, key)
    return (record as RUMenuWeek) || null
  }
}

// Instância singleton
const storage = new IndexedDBStorage()

export const getRuMenu = (campusId: number, date: string) =>
  storage.getRuMenu(campusId, date)
export const saveRuMenu = (menu: RUMenuDay) => storage.saveRuMenu(menu)

export const getRuMenuWeek = (campusId: number, weekStartDate: string) =>
  storage.getRuMenuWeek(campusId, weekStartDate)
export const saveRuMenuWeek = (week: RUMenuWeek) => storage.saveRuMenuWeek(week)

export const getSchedulesByCourse = (courseId: string) =>
  storage.getSchedulesByCourse(courseId)
export const getAllSchedules = () => storage.getAllSchedules()
export const saveSchedule = (s: Schedule) => storage.saveSchedule(s)
export const deleteSchedule = (id: string) => storage.deleteSchedule(id)
export const getCalendar = (year: number) => storage.getCalendar(year)
export const getCalendarRecord = (year: number) =>
  storage.getCalendarRecord(year)
export const getCalendarLastUpdateTime = (year: number) =>
  storage.getCalendarLastUpdateTime(year)
export const removeCalendar = (year: number) => storage.removeCalendar(year)
export const saveCalendar = (year: number, data: MonthGroup[]) =>
  storage.saveCalendar(year, data)

export const getCompletedSubjects = () => storage.getCompletedSubjects()
export const saveCompletedSubjects = (s: string[]) =>
  storage.saveCompletedSubjects(s)

// Hooks personalizados para React
export const useScheduleStorage = () => {
  // Salva dados no IndexedDB
  const saveScheduleData = useCallback(
    async (courseId: string, data: StorageClass) => {
      try {
        await storage.saveScheduleData(courseId, data)
      } catch (error) {
        console.error('Erro ao salvar dados:', error)
        throw error
      }
    },
    [],
  )

  // Busca dados específicos
  const getScheduleData = useCallback(
    async (
      courseId: string,
      year: number,
      semester: number,
    ): Promise<StorageClass | null> => {
      try {
        return await storage.getScheduleData(courseId, year, semester)
      } catch (error) {
        console.error('Erro ao buscar dados:', error)
        return null
      }
    },
    [],
  )

  // Busca uma disciplina específica
  const getCourseData = useCallback(
    async (
      courseId: string,
      year: number,
      semester: number,
      courseCode: string,
    ): Promise<SubjectGroup | null> => {
      try {
        return await storage.getCourseData(courseId, year, semester, courseCode)
      } catch (error) {
        console.error('Erro ao buscar disciplina:', error)
        return null
      }
    },
    [],
  )

  // Verifica se dados existem
  const hasScheduleData = useCallback(
    async (
      courseId: string,
      year: number,
      semester: number,
    ): Promise<boolean> => {
      try {
        return await storage.hasScheduleData(courseId, year, semester)
      } catch (error) {
        console.error('Erro ao verificar dados:', error)
        return false
      }
    },
    [],
  )

  // Busca todos os dados de um curso
  const getAllScheduleDataByCourse = useCallback(
    async (courseId: string): Promise<StorageClass[]> => {
      try {
        return await storage.getAllScheduleDataByCourse(courseId)
      } catch (error) {
        console.error('Erro ao buscar todos os dados do curso:', error)
        return []
      }
    },
    [],
  )

  // Busca todos os dados (todos os cursos)
  const getAllScheduleData = useCallback(async (): Promise<
    Array<StorageClass & { courseId: string }>
  > => {
    try {
      return await storage.getAllScheduleData()
    } catch (error) {
      console.error('Erro ao buscar todos os dados:', error)
      return []
    }
  }, [])

  // Remove dados específicos
  const removeScheduleData = useCallback(
    async (courseId: string, year: number, semester: number) => {
      try {
        await storage.removeScheduleData(courseId, year, semester)
      } catch (error) {
        console.error('Erro ao remover dados:', error)
        throw error
      }
    },
    [],
  )

  // Remove todos os dados de um curso
  const removeAllCourseData = useCallback(async (courseId: string) => {
    try {
      await storage.removeAllCourseData(courseId)
    } catch (error) {
      console.error('Erro ao remover dados do curso:', error)
      throw error
    }
  }, [])

  // Limpa todos os dados
  const clearAllData = useCallback(async () => {
    try {
      await storage.clearAllData()
    } catch (error) {
      console.error('Erro ao limpar dados:', error)
      throw error
    }
  }, [])

  // Obtém tempo da última atualização
  const getLastUpdateTime = useCallback(
    async (
      courseId: string,
      year: number,
      semester: number,
    ): Promise<Date | null> => {
      try {
        return await storage.getLastUpdateTime(courseId, year, semester)
      } catch (error) {
        console.error('Erro ao obter tempo de atualização:', error)
        return null
      }
    },
    [],
  )

  // --- HOOKS DE ACESSO DIRETO AO CALENDÁRIO ---
  const saveCalendar = useCallback(async (year: number, data: MonthGroup[]) => {
    try {
      await storage.saveCalendar(year, data)
    } catch (error) {
      console.error('Erro ao salvar calendário:', error)
    }
  }, [])

  const getCalendar = useCallback(async (year: number) => {
    try {
      return await storage.getCalendar(year)
    } catch (error) {
      console.error('Erro ao buscar calendário:', error)
      return null
    }
  }, [])

  const getCalendarRecord = useCallback(async (year: number) => {
    try {
      return await storage.getCalendarRecord(year)
    } catch (error) {
      console.error('Erro ao buscar registro do calendário:', error)
      return null
    }
  }, [])

  const getCalendarLastUpdateTime = useCallback(async (year: number) => {
    try {
      return await storage.getCalendarLastUpdateTime(year)
    } catch (error) {
      console.error('Erro ao buscar tempo de atualização do calendário:', error)
      return null
    }
  }, [])

  return {
    saveScheduleData,
    getScheduleData,
    getCourseData,
    hasScheduleData,
    getAllScheduleDataByCourse,
    getAllScheduleData,
    removeScheduleData,
    removeAllCourseData,
    clearAllData,
    getLastUpdateTime,
    saveCalendar,
    getCalendar,
    getCalendarRecord,
    getCalendarLastUpdateTime,
  }
}

// Utilitário para gerenciar cache e API
export function useScheduleManager() {
  const {
    saveScheduleData,
    getScheduleData,
    getCourseData,
    hasScheduleData,
    getLastUpdateTime,
  } = useScheduleStorage()

  // Função principal que busca dados (cache-first)
  const fetchScheduleData = useCallback(
    async (
      courseId: string,
      year: number,
      semester: number,
      forceRefresh: boolean = false,
      // Com a API, as turmas são lidas pelo slug do curso
      courseSlug?: string,
    ): Promise<StorageClass | null> => {
      try {
        // Se não é refresh forçado, tenta buscar do cache primeiro
        if (!forceRefresh) {
          const cachedData = await getScheduleData(courseId, year, semester)
          if (cachedData) {
            return cachedData
          }
        }

        // Busca da API
        const apiData = await getClassesInformationsService({
          courseId,
          courseSlug,
          year,
          semester,
        })

        // Salva no cache
        await saveScheduleData(courseId, apiData)

        return apiData
      } catch (error) {
        // Em caso de erro, tenta retornar dados do cache
        const cachedData = await getScheduleData(courseId, year, semester)
        if (cachedData) {
          return cachedData
        }

        throw error
      }
    },
    [getScheduleData, saveScheduleData],
  )

  // Função para buscar uma disciplina específica pelo código
  const fetchCourseData = useCallback(
    async (
      courseId: string,
      year: number,
      semester: number,
      courseCode: string,
      forceRefresh: boolean = false,
    ): Promise<SubjectGroup | null> => {
      try {
        // Se não é refresh forçado, tenta buscar do cache primeiro
        if (!forceRefresh) {
          const cachedCourse = await getCourseData(
            courseId,
            year,
            semester,
            courseCode,
          )
          if (cachedCourse) {
            return cachedCourse
          }
        }

        // Se não encontrou no cache, busca todos os dados do período
        const fullData = await fetchScheduleData(
          courseId,
          year,
          semester,
          forceRefresh,
        )
        if (!fullData) return null

        const course = fullData.classGroup.find((c) => c.code === courseCode)

        return course || null
      } catch (error) {
        console.error('Erro ao buscar disciplina:', error)

        // Em caso de erro, tenta retornar do cache
        if (!forceRefresh) {
          const cachedCourse = await getCourseData(
            courseId,
            year,
            semester,
            courseCode,
          )
          if (cachedCourse) {
            return cachedCourse
          }
        }

        throw error
      }
    },
    [getCourseData, fetchScheduleData],
  )

  // Função para buscar múltiplas disciplinas de uma vez
  const fetchMultipleCourses = useCallback(
    async (
      courseId: string,
      year: number,
      semester: number,
      courseCodes: string[],
      forceRefresh: boolean = false,
    ): Promise<SubjectGroup[]> => {
      const results: SubjectGroup[] = []

      for (const courseCode of courseCodes) {
        try {
          const course = await fetchCourseData(
            courseId,
            year,
            semester,
            courseCode,
            forceRefresh,
          )
          if (course) {
            results.push(course)
          }
        } catch (error) {
          console.error(`Erro ao buscar disciplina ${courseCode}:`, error)
        }
      }

      return results
    },
    [fetchCourseData],
  )

  // Função para atualizar dados específicos
  const refreshScheduleData = useCallback(
    async (
      courseId: string,
      year: number,
      semester: number,
      courseSlug?: string,
    ): Promise<StorageClass | null> => {
      return await fetchScheduleData(courseId, year, semester, true, courseSlug)
    },
    [fetchScheduleData],
  )

  // Função para atualizar uma disciplina específica
  const refreshCourseData = useCallback(
    async (
      courseId: string,
      year: number,
      semester: number,
      courseCode: string,
    ): Promise<SubjectGroup | null> => {
      return await fetchCourseData(courseId, year, semester, courseCode, true)
    },
    [fetchCourseData],
  )

  // Verifica se dados precisam ser atualizados
  const needsUpdate = useCallback(
    async (
      courseId: string,
      year: number,
      semester: number,
      maxAgeHours: number = 1,
    ): Promise<boolean> => {
      const lastUpdate = await getLastUpdateTime(courseId, year, semester)
      if (!lastUpdate) return true

      const now = new Date()
      const ageInHours =
        (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
      return ageInHours > maxAgeHours
    },
    [getLastUpdateTime],
  )

  return {
    fetchScheduleData,
    fetchCourseData,
    fetchMultipleCourses,
    refreshScheduleData,
    refreshCourseData,
    needsUpdate,
    hasScheduleData,
  }
}

// Quantidade padrão de dias para expiração do cache do calendário
export const CALENDAR_CACHE_MAX_AGE_DAYS = 7

// Verifica se o cache do calendário expirou com base na quantidade de dias
export function isCalendarCacheExpired(
  updatedAt: string | Date | null | undefined,
  maxAgeDays: number = CALENDAR_CACHE_MAX_AGE_DAYS,
): boolean {
  if (!updatedAt) return true
  const lastUpdate =
    typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt
  if (isNaN(lastUpdate.getTime())) return true

  const now = new Date()
  const diffInMs = now.getTime() - lastUpdate.getTime()
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24)

  return diffInDays >= maxAgeDays
}

// Normaliza e anota eventos importantes do calendário
export function formatCalendarEvents(data: MonthGroup[]): MonthGroup[] {
  return data.map((monthGroup) => {
    const transformedEvents = monthGroup.events.map((event) => {
      const normalizedDescription = normalizeWords(event.description)
      const isImportant = importantTerms.some((term) =>
        normalizedDescription.includes(term),
      )
      return { ...event, isImportant }
    })
    return { ...monthGroup, events: transformedEvents }
  })
}

// --- NOVO HOOK GERENCIADOR DO CALENDÁRIO ---
export function useCalendarManager() {
  const {
    getCalendar,
    getCalendarRecord,
    getCalendarLastUpdateTime,
    saveCalendar,
  } = useScheduleStorage()

  const checkNeedsUpdate = useCallback(
    async (
      year: number,
      maxAgeDays: number = CALENDAR_CACHE_MAX_AGE_DAYS,
    ): Promise<boolean> => {
      const lastUpdate = await getCalendarLastUpdateTime(year)
      return isCalendarCacheExpired(lastUpdate, maxAgeDays)
    },
    [getCalendarLastUpdateTime],
  )

  const fetchCalendar = useCallback(
    async (
      year: number,
      forceRefresh: boolean = false,
      maxAgeDays: number = CALENDAR_CACHE_MAX_AGE_DAYS,
    ) => {
      try {
        // 1. Tenta buscar do IndexedDB se não for forceRefresh
        if (!forceRefresh) {
          const cachedRecord = await getCalendarRecord(year)

          if (cachedRecord) {
            const isExpired = isCalendarCacheExpired(
              cachedRecord.updatedAt,
              maxAgeDays,
            )

            // Se o cache ainda for válido (diferença < 7 dias), utiliza ele
            if (!isExpired) {
              return formatCalendarEvents(cachedRecord.data)
            }
          }
        }

        // 2. Se não existir, for refresh forçado ou tiver passado a quantidade de dias especificada, busca da API
        const data = await getCalendarService({ year })

        // 3. Salva no banco atualizando a data da última atualização
        await saveCalendar(year, data)

        return formatCalendarEvents(data)
      } catch (error) {
        console.error('Erro ao buscar calendário:', error)

        // Em caso de falha na API, tenta retornar o cache antigo se existir (mesmo expirado)
        const cached = await getCalendar(year)
        if (cached) return formatCalendarEvents(cached)

        throw error
      }
    },
    [getCalendarRecord, getCalendar, saveCalendar],
  )

  return {
    fetchCalendar,
    getCalendarLastUpdateTime,
    checkNeedsUpdate,
  }
}

export default storage
