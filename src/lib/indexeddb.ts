// lib/indexeddb.ts
import { IDBPDatabase, openDB } from 'idb'
import { useCallback } from 'react'

import { getClassesInformationsService } from '@/services/scrapping/get-classes-informations'
import type { StorageClass, SubjectGroup } from '@/types/class'

// Configuração do banco
const DB_NAME = 'UFCFlowDB'
const DB_VERSION = 2 // Incrementado para incluir courseId
const STORE_NAME = 'schedules'

// Chave primária composta: courseId-year-semester
const generateKey = (courseId: string, year: number, semester: number) =>
  `${courseId}-${year}-${semester}`

class IndexedDBStorage {
  private db: IDBPDatabase | null = null

  // Inicializa o banco de dados
  async init(): Promise<void> {
    if (this.db) return

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Remove store antiga se existir (para migração)
        if (oldVersion < 2 && db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME)
        }

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
          })
          // Índices para facilitar buscas
          store.createIndex('courseId', 'courseId')
          store.createIndex('year', 'year')
          store.createIndex('semester', 'semester')
          store.createIndex('courseYear', ['courseId', 'year'])
          store.createIndex(
            'courseSemester',
            ['courseId', 'year', 'semester'],
            {
              unique: true,
            },
          )
        }
      },
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
}

// Instância singleton
const storage = new IndexedDBStorage()

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
    ): Promise<StorageClass | null> => {
      return await fetchScheduleData(courseId, year, semester, true)
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

export default storage
