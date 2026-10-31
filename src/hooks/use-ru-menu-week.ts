import { useQuery } from '@tanstack/react-query'
import { getRuMenuWeekService } from '@/services/scrapping/get-ru-menu'
import { getRuMenuWeek, saveRuMenuWeek } from '@/lib/indexeddb'
import { getMondayOfWeek } from '@/lib/ru-scraper'
import type { CampusId, RUMenuWeek } from '@/types/ru'

interface UseRuMenuWeekParams {
  campusId: CampusId
  date?: string // YYYY-MM-DD (data de referência da semana)
  enabled?: boolean
}

export function useRuMenuWeek({
  campusId,
  date,
  enabled = true,
}: UseRuMenuWeekParams) {
  const mondayDate = getMondayOfWeek(date)

  return useQuery<RUMenuWeek, Error>({
    queryKey: ['ru-menu-week', campusId, mondayDate],
    queryFn: async () => {
      // 1. Se estiver offline ou tiver cache recente no IndexedDB, tenta recuperar
      if (typeof window !== 'undefined') {
        try {
          const cached = await getRuMenuWeek(campusId, mondayDate)
          if (cached) {
            // Se offline, usa o cache local
            if (!navigator.onLine) {
              return cached
            }
            // Se o cache foi salvo há menos de 1 hora, usa o cache
            if (cached.updatedAt) {
              const diffMs = Date.now() - new Date(cached.updatedAt).getTime()
              if (diffMs < 60 * 60 * 1000) {
                return cached
              }
            }
          }
        } catch (err) {
          console.warn(
            'Erro ao consultar cache semanal do RU no IndexedDB:',
            err,
          )
        }
      }

      // 2. Busca os dados consolidados da semana da API do servidor
      try {
        const data = await getRuMenuWeekService({
          campusId,
          date: mondayDate,
        })

        // 3. Salva a semana e cada dia individualmente no IndexedDB
        if (typeof window !== 'undefined') {
          saveRuMenuWeek(data).catch((err) =>
            console.warn('Erro ao salvar cardápio semanal no IndexedDB:', err),
          )
        }

        return data
      } catch (err) {
        // Fallback: se a API falhar (ex: conexão instável), tenta recuperar do cache local
        if (typeof window !== 'undefined') {
          const cached = await getRuMenuWeek(campusId, mondayDate).catch(
            () => null,
          )
          if (cached) {
            return cached
          }
        }
        throw err
      }
    },
    enabled,
    staleTime: 1000 * 60 * 30, // 30 minutos de tolerância sem refetch
    gcTime: 1000 * 60 * 60 * 24, // 24 horas no cache do TanStack Query
    retry: 1,
  })
}
