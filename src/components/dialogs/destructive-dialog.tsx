import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useState, type ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

type DestructiveDialogProps = ComponentProps<typeof Dialog> & {
  title: string
  description: string
  confirmButtonText: string
  onConfirm: () => void
}

export function DestructiveDialog({
  children,
  title,
  description,
  confirmButtonText,
  onConfirm,
  ...props
}: DestructiveDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleConfirm = () => {
    onConfirm()
    setIsDialogOpen(false)
  }

  return (
    <Dialog {...props} open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="z-900 gap-0 p-0">
        <DialogHeader className="border-border flex border-b p-5">
          <AlertTriangle className="text-destructive size-10" />
          <DialogTitle className="font-clash text-destructive text-xl">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="p-5">
          <DialogDescription className="text-foreground text-base">
            {description}
          </DialogDescription>
        </div>

        <DialogFooter className="px-5 py-3">
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => setIsDialogOpen(false)}
          >
            Voltar
          </Button>
          <Button
            size="sm"
            type="submit"
            variant="destructive"
            form="create-schedule-form"
            onClick={handleConfirm}
          >
            {confirmButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
