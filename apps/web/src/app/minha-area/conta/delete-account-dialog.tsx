'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useId, useState, useTransition, type FormEvent } from 'react'
import { toast } from 'sonner'

import { FieldError } from '@/components/auth/form-parts'
import { PasswordInput } from '@/components/auth/password-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { deleteAccountAction } from '@/lib/account/account-actions'
import { SESSION_QUERY_KEY } from '@/lib/auth/use-session'

// O que sai e o que fica (modelagem, Usuários › LGPD)
const ERASED = [
  'Matrículas, histórico e horas complementares',
  'Agendas sincronizadas e preferências',
  'Foto de perfil e certificados',
  'Sessões abertas, curtidas e notificações',
]
const ANONYMIZED = [
  'Suas mensagens no fórum viram "mensagem removida", e as conversas continuam',
  'Suas avaliações continuam nas médias, sem ligação com você',
  'Posts que você publicou no hub ficam sem autor',
]

export function DeleteAccountDialog({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const passwordId = useId()
  const errorId = useId()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [isDeleting, startDeleting] = useTransition()

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!password) {
      setError('Informe a senha')
      return
    }
    startDeleting(async () => {
      const result = await deleteAccountAction(password)
      if (!result.ok) {
        setError(result.problem.detail ?? 'Não foi possível excluir a conta.')
        return
      }
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
      toast.success('Conta excluída', {
        description: 'Você pode continuar usando o UFC Flow sem conta.',
      })
      router.replace('/cursos')
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        if (!value) {
          setPassword('')
          setError(undefined)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-fit">
          Excluir minha conta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Excluir a conta?</DialogTitle>
          <DialogDescription>
            Não dá para desfazer. Grade, turmas e agenda continuam funcionando
            sem conta, só no seu navegador.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-sm">
            <p className="font-medium">Apagado de vez</p>
            <ul className="list-disc pl-5 text-muted-foreground">
              {ERASED.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <p className="font-medium">Fica, sem o seu nome</p>
            <ul className="list-disc pl-5 text-muted-foreground">
              {ANONYMIZED.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          {isAdmin && (
            <p className="text-sm text-muted-foreground">
              Se você for o único admin, nomeie outro antes de excluir a conta.
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={passwordId}>Confirme com a sua senha</Label>
            <PasswordInput
              id={passwordId}
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError(undefined)
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
            />
            <FieldError id={errorId} message={error} />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isDeleting}
              aria-busy={isDeleting}
            >
              {isDeleting ? 'Excluindo…' : 'Excluir de vez'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
