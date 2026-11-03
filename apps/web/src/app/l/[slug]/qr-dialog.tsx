'use client'

import { DownloadSimpleIcon } from '@phosphor-icons/react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// QR code gerado no navegador; quem lê chega com ?src=qr e conta como QR
export function QrDialog({
  open,
  onOpenChange,
  url,
  slug,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  slug: string
}) {
  const [image, setImage] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !url) return
    let active = true
    QRCode.toDataURL(`${url}?src=qr`, { margin: 1, width: 480 })
      .then((data) => active && setImage(data))
      .catch(() => active && setImage(null))
    return () => {
      active = false
    }
  }, [open, url])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>QR code da página</DialogTitle>
          <DialogDescription>
            Para cartazes e slides. As visitas por ele aparecem à parte nas
            estatísticas.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center rounded-xl border bg-white p-4">
          {image ? (
            <img
              src={image}
              alt={`QR code para ${url}`}
              width={240}
              height={240}
            />
          ) : (
            <div
              aria-hidden
              className="size-60 animate-pulse rounded bg-muted motion-reduce:animate-none"
            />
          )}
        </div>
        {image && (
          <Button asChild>
            <a href={image} download={`links-${slug}-qr.png`}>
              <DownloadSimpleIcon aria-hidden className="size-4" />
              Baixar PNG
            </a>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
