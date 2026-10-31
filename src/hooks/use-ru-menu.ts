import { useQuery } from '@tanstack/react-query'
import { getRuMenuService } from '@/services/scrapping/get-ru-menu'
import { getRuMenu, saveRuMenu } from '@/lib/indexeddb'
import type { CampusId, RUMenuDay } from '@/types/ru'

interface UseRuMenuParams {
  campusId: CampusId
  date?: string // YYYY-MM-DD
}

export function useRuMenu({ campusId, date }: UseRuMenuParams) {
  return useQuery<RUMenuDay, Error>({
    queryKey: ['ru-menu', campusId, date || 'today'],
    queryFn: async () => {
      // 1. Se estiver offline ou tiver cache recente, tenta ler do IndexedDB
      if (typeof window !== 'undefined' && date) {
        try {
          const cached = await getRuMenu(campusId, date)
          if (cached && cached.date === date) {
            // Garante que o rótulo em cache corresponda ao dia/mês solicitado (evita cache corrompido de fuso anterior)
            const parts = date.split('-')
            const expectedDayMonth = `${parts[2]}/${parts[1]}`
            const isConsistent =
              !cached.currentLabel ||
              cached.currentLabel.includes(expectedDayMonth)

            if (isConsistent) {
              // Se tiver cache e não estiver online, usa cache
              if (!navigator.onLine) {
                return cached
              }
              // Se cache foi atualizado há menos de 1 hora, usa cache
              if (cached.updatedAt) {
                const diffMs = Date.now() - new Date(cached.updatedAt).getTime()
                if (diffMs < 60 * 60 * 1000) {
                  return cached
                }
              }
            }
          }
        } catch (err) {
          console.warn('Erro ao consultar cache do RU no IndexedDB:', err)
        }
      }

      // 2. Busca da API do servidor
      try {
        const data = await getRuMenuService({ campusId, date })

        // 3. Salva no IndexedDB
        if (typeof window !== 'undefined') {
          saveRuMenu(data).catch((err) =>
            console.warn('Erro ao salvar cardápio do RU no IndexedDB:', err),
          )
        }

        return data
      } catch (err) {
        // Fallback: se a API falhar, tenta recuperar do IndexedDB
        if (typeof window !== 'undefined' && date) {
          const cached = await getRuMenu(campusId, date).catch(() => null)
          if (cached) {
            return cached
          }
        }
        throw err
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutos
    gcTime: 1000 * 60 * 60 * 24, // 24 horas
    retry: 1,
  })
}
