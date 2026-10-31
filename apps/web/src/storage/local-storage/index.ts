const STORE_VERSION = 1

export const STORE_KEY = `ufc-flow-local-storage-v${STORE_VERSION}`

export function getFromLocalStorage(key: string): string {
  if (typeof window === 'undefined') return ''

  return localStorage.getItem(`${STORE_KEY}-${key}`) || ''
}

export function setToLocalStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return

  localStorage.setItem(`${STORE_KEY}-${key}`, value)
}

export function removeFromLocalStorage(key: string): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem(`${STORE_KEY}-${key}`)
}
