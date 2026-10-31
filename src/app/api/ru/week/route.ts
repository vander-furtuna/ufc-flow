import { scrapeRUMenuWeek } from '@/lib/ru-scraper'
import { resolveCampusId } from '@/types/ru'

export const dynamic = 'force-dynamic'

export async function GET(req: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get('date') || undefined

    const campusId = resolveCampusId(searchParams.get('campus'))

    const weekMenu = await scrapeRUMenuWeek(campusId, dateParam)

    return Response.json(weekMenu, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    })
  } catch (err: unknown) {
    const error = err as Error
    return Response.json(
      {
        error:
          error?.message || 'Erro interno ao consultar cardápio semanal do RU',
      },
      { status: 500 },
    )
  }
}
