import { getFromLocalStorage, setToLocalStorage } from '.'

const TUTORIAL_KEY = 'tutorial-show'

export function getTutorialShown(): boolean {
  const storedValue = getFromLocalStorage(TUTORIAL_KEY)
  return storedValue ? storedValue === 'true' : false
}

export function setTutorialShown(): void {
  if (typeof window === 'undefined') return

  setToLocalStorage(TUTORIAL_KEY, 'true')
}
