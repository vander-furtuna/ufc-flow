'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { AcademicEvent } from '@/types/calendar'
import { Calendar } from 'lucide-react'
import type { ComponentProps } from 'react'

type CalendarDayDialogProps = {
  date: string
  events: AcademicEvent[]
} & ComponentProps<typeof Dialog>

export default function CalendarDayDialog({
  date,
  events,
  ...props
}: CalendarDayDialogProps) {
  const formatedDate = date
    ? new Date(date).toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : ''

  return (
    <Dialog {...props}>
      <DialogContent className="z-1000 flex flex-col gap-0 overflow-y-visible p-0 sm:max-w-md [&>button:last-child]:top-3.5">
        <DialogHeader className="bg-accent/50 flex flex-row items-center gap-2 space-y-0 p-5 pr-10!">
          <div className="bg-foreground text-background flex items-center justify-center rounded-lg border p-2">
            <Calendar className="h-5 w-5" />
          </div>
          <DialogTitle className="font-heading text-left! text-lg first-letter:uppercase">
            {formatedDate}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Make changes to your profile here. You can change your photo and set a
          username.
        </DialogDescription>

        <div className="no-scrollbar max-h-[60vh] overflow-y-auto p-5">
          {events.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">
              <Calendar className="mx-auto mb-4 h-12 w-12 opacity-20" />
              <p>Nenhum evento registrado para este dia.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {events.map((event) => (
                <div key={event.id} className="relative py-1 pl-4">
                  <div
                    className={cn(
                      'bg-primary absolute top-0 bottom-0 left-0 w-1 rounded-full',
                      event.isImportant && 'bg-compulsory',
                    )}
                  ></div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-primary bg-accent rounded border px-2 py-0.5 text-sm font-bold tracking-wider uppercase">
                      {event.originalDateString}
                    </span>
                  </div>
                  <p className="text-card-foreground text-sm leading-relaxed font-medium">
                    {event.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <DialogClose
            render={(props) => (
              <Button type="button" variant="outline" {...props}>
                Fechar
              </Button>
            )}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
