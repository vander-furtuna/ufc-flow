export function getUrl(path?: string) {
  const baseUrl = 'http://localhost:3000'
  const normalizedPath = path && !path.startsWith('/') ? `/${path}` : path || ''
  return `${baseUrl}${normalizedPath}`
}
