import type { CurriculumImportV1 } from '@ufc-flow/contracts'
import { normalizeSearchText } from '@ufc-flow/academic-core'

const slug = (text: string) =>
  normalizeSearchText(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// "engenharia-de-computacao-2006-2.json"
export const importFileName = (data: CurriculumImportV1) =>
  `${slug(data.course.name)}-${slug(data.curriculum.code)}.json`

export const importJson = (data: CurriculumImportV1) =>
  JSON.stringify(data, null, 2)

export function downloadText(text: string, fileName: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
