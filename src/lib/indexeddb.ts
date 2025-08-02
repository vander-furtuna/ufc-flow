// lib/indexeddb.ts
import { IDBPDatabase, openDB } from 'idb'
import { useCallback } from 'react'

import { getClassesInformationsService } from '@/services/scrapping/get-classes-informations'
import type { StorageClass } from '@/types/class'

// Configuração do banco
const DB_NAME = 'UFCFlowDB'
const DB_VERSION = 1
const STORE_NAME = 'schedules'

// Chave primária composta
const generateKey = (year: number, semester: number) => `${year}-${semester}`

class IndexedDBStorage {
  private db: IDBPDatabase | null = null

  // Inicializa o banco de dados
  async init(): Promise<void> {
    if (this.db) return

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
          })
          // Índice para facilitar buscas
          store.createIndex('year', 'year')
          store.createIndex('semester', 'semester')
          store.createIndex('yearSemester', ['year', 'semester'], {
            unique: true,
          })
        }
      },
    })
  }

  // Salva ou atualiza dados de um período específico
  async saveScheduleData(data: StorageClass): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const key = generateKey(data.year, data.semester)
    const record = {
      id: key,
      ...data,
      updatedAt: new Date().toISOString(),
    }

    const tx = this.db.transaction(STORE_NAME, 'readwrite')
    await tx.store.put(record)
    await tx.done
  }

  // Busca dados de um período específico
  async getScheduleData(
    year: number,
    semester: number,
  ): Promise<StorageClass | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const key = generateKey(year, semester)
    const record = await this.db.get(STORE_NAME, key)

    if (!record) return null

    // Remove campos internos antes de retornar
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, updatedAt, ...scheduleData } = record
    return scheduleData as StorageClass
  }

  // Busca todos os dados salvos
  async getAllScheduleData(): Promise<StorageClass[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const records = await this.db.getAll(STORE_NAME)

    return records.map((record) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, updatedAt, ...scheduleData } = record
      return scheduleData as StorageClass
    })
  }

  // Verifica se existe dados para um período
  async hasScheduleData(year: number, semester: number): Promise<boolean> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const key = generateKey(year, semester)
    const record = await this.db.get(STORE_NAME, key)
    return !!record
  }

  // Remove dados de um período específico
  async removeScheduleData(year: number, semester: number): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const key = generateKey(year, semester)
    await this.db.delete(STORE_NAME, key)
  }

  // Limpa todos os dados
  async clearAllData(): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    await this.db.clear(STORE_NAME)
  }

  // Busca dados por ano
  async getSchedulesByYear(year: number): Promise<StorageClass[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const tx = this.db.transaction(STORE_NAME, 'readonly')
    const index = tx.store.index('year')
    const records = await index.getAll(year)

    return records.map((record) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, updatedAt, ...scheduleData } = record
      return scheduleData as StorageClass
    })
  }

  // Obtém informações sobre quando os dados foram atualizados
  async getLastUpdateTime(
    year: number,
    semester: number,
  ): Promise<Date | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const key = generateKey(year, semester)
    const record = await this.db.get(STORE_NAME, key)

    return record?.updatedAt ? new Date(record.updatedAt) : null
  }
}

// Instância singleton
const storage = new IndexedDBStorage()

// Hooks personalizados para React
export const useScheduleStorage = () => {
  // Salva dados no IndexedDB
  const saveScheduleData = async (data: StorageClass) => {
    try {
      await storage.saveScheduleData(data)
    } catch (error) {
      console.error('Erro ao salvar dados:', error)
      throw error
    }
  }

  // Busca dados específicos
  const getScheduleData = async (
    year: number,
    semester: number,
  ): Promise<StorageClass | null> => {
    try {
      return await storage.getScheduleData(year, semester)
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      return null
    }
  }

  // Verifica se dados existem
  const hasScheduleData = async (
    year: number,
    semester: number,
  ): Promise<boolean> => {
    try {
      return await storage.hasScheduleData(year, semester)
    } catch (error) {
      console.error('Erro ao verificar dados:', error)
      return false
    }
  }

  // Busca todos os dados
  const getAllScheduleData = async (): Promise<StorageClass[]> => {
    try {
      return await storage.getAllScheduleData()
    } catch (error) {
      console.error('Erro ao buscar todos os dados:', error)
      return []
    }
  }

  // Remove dados específicos
  const removeScheduleData = async (year: number, semester: number) => {
    try {
      await storage.removeScheduleData(year, semester)
    } catch (error) {
      console.error('Erro ao remover dados:', error)
      throw error
    }
  }

  // Limpa todos os dados
  const clearAllData = async () => {
    try {
      await storage.clearAllData()
    } catch (error) {
      console.error('Erro ao limpar dados:', error)
      throw error
    }
  }

  // Obtém tempo da última atualização
  const getLastUpdateTime = async (
    year: number,
    semester: number,
  ): Promise<Date | null> => {
    try {
      return await storage.getLastUpdateTime(year, semester)
    } catch (error) {
      console.error('Erro ao obter tempo de atualização:', error)
      return null
    }
  }

  return {
    saveScheduleData,
    getScheduleData,
    hasScheduleData,
    getAllScheduleData,
    removeScheduleData,
    clearAllData,
    getLastUpdateTime,
  }
}

// Utilitário para gerenciar cache e API
export function useScheduleManager() {
  const {
    saveScheduleData,
    getScheduleData,
    hasScheduleData,
    getLastUpdateTime,
  } = useScheduleStorage()

  // Função principal que busca dados (cache-first)
  const fetchScheduleData = useCallback(
    async (
      year: number,
      semester: number,
      forceRefresh: boolean = false,
    ): Promise<StorageClass | null> => {
      try {
        // Se não é refresh forçado, tenta buscar do cache primeiro
        if (!forceRefresh) {
          const cachedData = await getScheduleData(year, semester)
          if (cachedData) {
            return cachedData
          }
        }

        // Busca da API

        const apiData = await getClassesInformationsService({
          year,
          semester,
        })

        // Salva no cache
        await saveScheduleData(apiData)

        return apiData
      } catch (error) {
        const cachedData = await getScheduleData(year, semester)
        if (cachedData) {
          return cachedData
        }

        throw error
      }
    },
    [getScheduleData, saveScheduleData],
  )

  // Função para atualizar dados específicos
  const refreshScheduleData = useCallback(
    async (year: number, semester: number): Promise<StorageClass | null> => {
      return await fetchScheduleData(year, semester, true)
    },
    [fetchScheduleData],
  )

  // Verifica se dados precisam ser atualizados (exemplo: mais de 1 hora)
  const needsUpdate = useCallback(
    async (
      year: number,
      semester: number,
      maxAgeHours: number = 1,
    ): Promise<boolean> => {
      const lastUpdate = await getLastUpdateTime(year, semester)
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
    refreshScheduleData,
    needsUpdate,
    hasScheduleData,
  }
}

export default storage
