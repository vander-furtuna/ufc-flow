import { headers, type UnsafeUnwrappedHeaders } from 'next/headers';

export function getUrl(path?: string) {
  const host = (headers() as unknown as UnsafeUnwrappedHeaders).get('host') || 'localhost:3000'
  // Ajusta o protocolo conforme o ambiente
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = `${protocol}://${host}`
  const normalizedPath = path && !path.startsWith('/') ? `/${path}` : path || ''
  return `${baseUrl}${normalizedPath}`
}
