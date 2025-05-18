import { headers } from 'next/headers'

export async function getUrl(path?: string) {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'

  // Ajusta o protocolo conforme o ambiente
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = `${protocol}://${host}`
  const normalizedPath = path && !path.startsWith('/') ? `/${path}` : path || ''

  return `${baseUrl}${normalizedPath}`
}
