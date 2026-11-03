import { API_URL } from '@/lib/auth/api'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Clique na página de links: a API soma o clique e responde 302. O destino
// interno ("/arquivos/..", "/{curso}/hub/..") vale a partir do web.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; linkId: string }> },
) {
  const { slug, linkId } = await params
  if (!SLUG.test(slug) || !UUID.test(linkId)) {
    return new Response(null, { status: 404 })
  }
  const source = new URL(request.url).searchParams.get('src')
  const query = source ? `?src=${encodeURIComponent(source)}` : ''
  let response: Response
  try {
    response = await fetch(
      `${API_URL}/v1/link-pages/${slug}/go/${linkId}${query}`,
      { redirect: 'manual', cache: 'no-store' },
    )
  } catch {
    return new Response(null, { status: 503 })
  }
  const location = response.headers.get('location')
  if (response.status !== 302 || !location) {
    return new Response(null, {
      status: response.status === 404 ? 404 : 502,
      headers: { 'cache-control': 'no-store' },
    })
  }
  const target = new URL(location, request.url)
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return new Response(null, { status: 502 })
  }
  return new Response(null, {
    status: 302,
    headers: { location: target.toString(), 'cache-control': 'no-store' },
  })
}
