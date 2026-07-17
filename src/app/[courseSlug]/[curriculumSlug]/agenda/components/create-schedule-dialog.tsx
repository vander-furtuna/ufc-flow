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
import { useSchedule } from '@/contexts/schedule'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Controller, useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'

type CreateScheduleDialogProps = ComponentProps<typeof Dialog> & {
  children?: React.ReactElement
}

const createScheduleFormSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
})

type CreateScheduleFormData = z.infer<typeof createScheduleFormSchema>

export function CreateScheduleDialog({
  children,

  ...props
}: CreateScheduleDialogProps) {
  const { createSchedule } = useSchedule()

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleCreateSchedule = async ({ name }: CreateScheduleFormData) => {
    await createSchedule(name)
    setIsDialogOpen(false)
  }

  const { control, handleSubmit } = useForm<CreateScheduleFormData>({
    resolver: zodResolver(createScheduleFormSchema),
    defaultValues: {
      name: '',
    },
  })

  return (
    <Dialog {...props} open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="z-500 gap-0 p-0">
        <DialogHeader className="border-border border-b p-5">
          <DialogTitle className="font-heading text-xl">
            Criar nova agenda
          </DialogTitle>
          <DialogDescription>
            Defina um nome para sua nova agenda de horários.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleCreateSchedule)}
          className="p-5"
          id="create-schedule-form"
        >
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nome</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="Ex: Agenda Semestre 1"
                  autoComplete="off"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </form>
        <DialogFooter className="px-5 py-3">
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => setIsDialogOpen(false)}
          >
            Voltar
          </Button>
          <Button size="sm" type="submit" form="create-schedule-form">
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
