export function getUrl(path?: string) {
  const baseUrl = 'https://ufc-flow.vercel.app'
  const normalizedPath = path && !path.startsWith('/') ? `/${path}` : path || ''
  return `${baseUrl}${normalizedPath}`
}
