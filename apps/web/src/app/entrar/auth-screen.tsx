'use client'

import {
  CalendarBlankIcon,
  CaretRightIcon,
  ChatCircleIcon,
  GraduationCapIcon,
} from '@phosphor-icons/react'
import Link from 'next/link'
import { useState } from 'react'

import { Logo } from '@/components/logo'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { SignInForm, SignUpForm } from './auth-forms'

export type AuthTab = 'entrar' | 'criar'

const HEADINGS: Record<AuthTab, { title: string; subtitle: string }> = {
  entrar: {
    title: 'Bem-vindo de volta',
    subtitle: 'Entre para ver seu histórico, agendas e o hub do curso.',
  },
  criar: {
    title: 'Crie sua conta',
    subtitle: 'Leva um minuto. Depois você vincula seu curso e matrícula.',
  },
}

const BENEFITS = [
  {
    icon: GraduationCapIcon,
    color: 'text-orange-500',
    text: 'Histórico de disciplinas e progresso de integralização',
  },
  {
    icon: CalendarBlankIcon,
    color: 'text-cyan-600',
    text: 'Agendas salvas na sua conta, em qualquer dispositivo',
  },
  {
    icon: ChatCircleIcon,
    color: 'text-green-600',
    text: 'Hub de notícias, bolsas e eventos, e o fórum da turma',
  },
]

// Manchas de cor do mockup (decorativas)
function Glow({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
    />
  )
}

const tabClass =
  'h-10 flex-1 rounded-[10px] text-sm font-semibold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'

export function AuthScreen({
  initialTab,
  next,
}: {
  initialTab: AuthTab
  next: string
}) {
  const [tab, setTab] = useState<AuthTab>(initialTab)
  const heading = HEADINGS[tab]

  // A aba fica na URL (?aba=criar) para o link e o recarregar abrirem nela
  const changeTab = (next: AuthTab) => {
    setTab(next)
    const url = new URL(window.location.href)
    if (next === 'criar') url.searchParams.set('aba', 'criar')
    else url.searchParams.delete('aba')
    window.history.replaceState(window.history.state, '', url)
  }

  return (
    <div className="grid min-h-dvh w-full bg-background lg:grid-cols-2">
      <aside className="relative hidden flex-col overflow-hidden border-r bg-slate-50 p-16 lg:flex dark:bg-slate-950">
        <Glow className="-top-24 left-1/3 size-[520px] bg-green-300/60 dark:bg-green-500/15" />
        <Glow className="top-0 -right-24 size-[420px] bg-cyan-300/50 dark:bg-cyan-500/15" />
        <Glow className="-bottom-32 -left-24 size-[460px] bg-orange-300/50 dark:bg-orange-500/15" />
        <Logo className="relative h-16 w-auto self-start" />
        <div className="relative my-auto flex max-w-lg flex-col gap-6">
          <h1 className="font-clash text-[3.25rem] leading-[1.05] font-semibold">
            Seu curso, do primeiro período à colação.
          </h1>
          <p className="text-lg text-muted-foreground">
            Crie uma conta para guardar seu histórico, acompanhar a
            integralização e participar do hub e do fórum do seu curso.
          </p>
          <ul className="flex flex-col gap-4">
            {BENEFITS.map(({ icon: Icon, color, text }) => (
              <li key={text} className="flex items-center gap-4">
                <span className="flex size-10 items-center justify-center rounded-[10px] border bg-background">
                  <Icon className={`size-5 ${color}`} />
                </span>
                <span className="font-medium">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-muted-foreground">
          Sem conta você continua vendo grades, turmas e montando agendas no seu
          navegador.
        </p>
      </aside>

      <section className="relative flex flex-col overflow-hidden px-6 py-10 sm:px-10 lg:justify-center">
        <Glow className="-top-24 -right-24 size-72 bg-green-300/50 lg:hidden dark:bg-green-500/15" />
        <div className="relative mx-auto flex w-full max-w-[400px] flex-1 flex-col gap-6 lg:flex-none">
          <Logo className="h-12 w-auto self-start lg:hidden" />
          <header className="flex flex-col gap-2">
            <h2 className="font-clash text-3xl font-semibold lg:text-[2rem]">
              {heading.title}
            </h2>
            <p className="text-muted-foreground">{heading.subtitle}</p>
          </header>

          <Tabs
            value={tab}
            onValueChange={(value) => changeTab(value as AuthTab)}
            className="flex flex-col gap-6"
          >
            <TabsList className="flex h-auto w-full rounded-[14px] border bg-muted p-1">
              <TabsTrigger value="entrar" className={tabClass}>
                Entrar
              </TabsTrigger>
              <TabsTrigger value="criar" className={tabClass}>
                Criar conta
              </TabsTrigger>
            </TabsList>
            <TabsContent value="entrar" className="mt-0">
              <SignInForm next={next} />
            </TabsContent>
            <TabsContent value="criar" className="mt-0">
              <SignUpForm next={next} />
            </TabsContent>
          </Tabs>

          <div className="mt-auto flex flex-col gap-6 lg:mt-0">
            <div className="hidden items-center gap-4 text-sm text-muted-foreground lg:flex">
              <span className="h-px flex-1 bg-border" />
              ou
              <span className="h-px flex-1 bg-border" />
            </div>
            <Link
              href={next}
              className="flex h-12 items-center justify-center gap-2 rounded-[12px] border bg-muted font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Continuar sem conta
              <CaretRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
