import { toPng } from 'html-to-image'
import { useCallback, useRef, useState } from 'react'

export function useDownloadAsPNG() {
  const elementRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const downloadPNG = useCallback((fileName: string) => {
    if (elementRef.current === null) {
      setError(new Error('Elemento de referência não encontrado.'))
      return
    }

    setIsLoading(true)
    setError(null)

    elementRef.current.dataset.download = 'active'

    toPng(elementRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      height: elementRef.current.scrollHeight,

      style: {
        height: String(elementRef.current.scrollHeight),
        overflow: 'visible',
        overflowY: 'visible',
        borderRadius: '0px',
      },
    })
      .then((dataUrl) => {
        const link = document.createElement('a')
        link.download = fileName ? `${fileName}.png` : 'disciplina.png'
        link.href = dataUrl
        link.click()
        elementRef.current!.dataset.download = 'inactive'
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err)
        setIsLoading(false)
      })
  }, [])

  return { elementRef, downloadPNG, isLoading, error }
}
