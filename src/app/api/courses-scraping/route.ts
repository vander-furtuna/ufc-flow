import { load } from 'cheerio'
import fetch from 'node-fetch'

export async function GET(): Promise<Response> {
  try {
    const url =
      'https://si3.ufc.br/sigaa/public/curso/lista.jsf?nivel=G&aba=p-graduacao'
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch SIGAA courses: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const decoder = new TextDecoder('iso-8859-1')
    const html = decoder.decode(arrayBuffer)
    const $ = load(html)

    const courses: { name: string; city: string; courseId: string }[] = []

    $('table.listagem tbody tr').each((_, element) => {
      const $tr = $(element)

      // Skip headers or campus grouping lines
      if (
        $tr.find('td.subFormulario').length > 0 ||
        $tr.find('td[colspan]').length > 0
      ) {
        return
      }

      const tds = $tr.find('td')
      // Make sure it contains name, city, modality, coordinator, and details link cols
      if (tds.length < 5) return

      const name = tds.eq(0).text().trim()
      const city = tds.eq(1).text().trim()
      const href = tds.eq(4).find('a').attr('href') || ''

      const params = new URLSearchParams(href.split('?')[1] || '')
      const courseId = params.get('id') || ''

      if (name && city && courseId) {
        courses.push({
          name,
          city,
          courseId,
        })
      }
    })

    return Response.json(courses)
  } catch (error) {
    const err = error as Error
    return Response.json(
      { error: err.message },
      { status: 500 },
    )
  }
}
