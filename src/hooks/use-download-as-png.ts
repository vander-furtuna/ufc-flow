import { toPng } from 'html-to-image'
import { useRef, useState } from 'react'

type UseDownloadAsPNGProps = {
  height?: number
  width?: number
}

export function useDownloadAsPNG({
  height,
  width,
}: UseDownloadAsPNGProps = {}) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const downloadPNG = async (fileName: string) => {
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
      height: height ?? elementRef.current.scrollHeight,
      width: width ?? elementRef.current.scrollWidth,

      style: {
        width: `${width ?? elementRef.current.scrollWidth}px`,
        height: `${height ?? elementRef.current.scrollHeight}px`,
        overflow: 'visible',
        overflowY: 'visible',
        borderRadius: '0px',
      },
    })
      .then((dataUrl) => {
        const link = document.createElement('a')
        link.download = fileName
          ? `${fileName}.png`
          : `ufc-flow-img-${Date.now()}.png`
        link.href = dataUrl
        link.click()
        elementRef.current!.dataset.download = 'inactive'
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('Erro ao baixar como PNG:', err)
        setError(err)
        setIsLoading(false)
      })
  }

  return { elementRef, downloadPNG, isLoading, error }
}
