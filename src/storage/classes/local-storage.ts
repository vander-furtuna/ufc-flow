import { CLASS_STORAGE_KEY } from '@/constants/class-storage-key'
import type { StorageClass } from '@/contexts/class'

export function saveClassesInStorage(classes: StorageClass[]) {
  const serializedClasses = JSON.stringify(classes)
  localStorage.setItem(CLASS_STORAGE_KEY, serializedClasses)
}

export function getClassesFromStorage(): StorageClass[] {
  const serializedClasses = localStorage.getItem(CLASS_STORAGE_KEY)
  if (!serializedClasses) return []

  try {
    return JSON.parse(serializedClasses) as StorageClass[]
  } catch (error) {
    console.error('Error parsing classes from storage:', error)
    return []
  }
}

export function clearClassesStorage() {
  localStorage.removeItem(CLASS_STORAGE_KEY)
}
export function updateClassInStorage(updatedClass: StorageClass) {
  const classes = getClassesFromStorage()
  const classIndex = classes.findIndex(
    (c) => c.classGroup.courseCode === updatedClass.classGroup.courseCode,
  )

  if (classIndex !== -1) {
    classes[classIndex] = updatedClass
    saveClassesInStorage(classes)
  } else {
    console.warn('Class not found in storage for update:', updatedClass)
  }
}
export function removeClassFromStorage(courseCode: string) {
  const classes = getClassesFromStorage()
  const updatedClasses = classes.filter(
    (c) => c.classGroup.courseCode !== courseCode,
  )
  saveClassesInStorage(updatedClasses)
}
