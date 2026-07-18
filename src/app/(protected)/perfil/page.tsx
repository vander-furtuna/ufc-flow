import { Glow } from '@/components/glow'
import { Header } from '@/components/header'
import { AvatarFallback, Avatar } from '@/components/ui/avatar'
import { getCurrentUserAction } from '@/features/auth/services/actions'
import { COURSES_DATA } from '@/data/courses'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GraduationCap, ArrowRight, UserCheck, ShieldAlert } from 'lucide-react'

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return 'US'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default async function ProfilePage() {
  const user = await getCurrentUserAction()

  if (!user) {
    redirect('/entrar')
  }

  const currentRole =
    user.courseRoles?.find((r) => r.isCurrent) || user.courseRoles?.[0]
  const course = currentRole
    ? COURSES_DATA.find((c) => c.id === currentRole.courseId)
    : null

  return (
    <main className="flex h-full min-h-dvh w-full items-start justify-center gap-4 overflow-hidden px-6 md:gap-12">
      <section className="flex h-full min-h-dvh w-full max-w-7xl flex-col items-center justify-start gap-8 pt-12 pb-24">
        <Header />
        <div className="flex w-full flex-col gap-8 md:flex-row">
          <div className="flex w-full flex-col gap-6">
            <div className="flex w-full flex-col">
              <h1 className="font-heading text-4xl font-semibold">
                Olá, {user.name.split(' ')[0]}!
              </h1>
              <p className="text-accent-foreground/90">
                Como está seu fluxo hoje?
              </p>
            </div>

            {/* Left side content: if no course, show onboarding, otherwise show history/progress info */}
            {!course ? (
              <div className="bg-card/40 flex min-h-[300px] w-full flex-col items-center justify-center rounded-2xl border border-[#1e293b] p-8 text-center backdrop-blur-md">
                <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-400 ring-1 ring-cyan-500/30">
                  <GraduationCap className="h-10 w-10 animate-pulse" />
                </div>
                <h2 className="font-heading text-2xl font-semibold text-[#f8fafc]">
                  Vincule seu Curso
                </h2>
                <p className="mt-2 max-w-md text-sm text-[#90a1b9]">
                  Para visualizar seu progresso acadêmico, gerenciar suas
                  disciplinas e organizar seu fluxo de estudos, você precisa
                  vincular sua matrícula a um curso.
                </p>
                <Link href="/cursos" className="mt-6">
                  <Button className="group cursor-pointer gap-2 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 px-6 py-5 font-semibold text-white shadow-lg shadow-cyan-500/10 hover:from-cyan-400 hover:to-blue-500">
                    Escolher Curso
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="bg-card/40 flex w-full flex-col gap-6 rounded-2xl border border-[#1e293b] p-6 backdrop-blur-md">
                <div>
                  <h3 className="text-lg font-semibold text-[#f8fafc]">
                    Grade Curricular & Histórico
                  </h3>
                  <p className="text-sm text-[#90a1b9]">
                    Você está vinculado ao currículo do curso de {course.name}.
                    Veja abaixo seu resumo acadêmico.
                  </p>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Link
                    href={`/${course.slug}/${course.curriculumStructures[0]?.slug || '2006-2'}`}
                  >
                    <Button
                      variant="outline"
                      className="cursor-pointer gap-2 border-[#1e293b] text-[#f8fafc] hover:bg-[#111c30]"
                    >
                      Ver Grade Curricular
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right side: User card */}
          <div className="bg-card/60 w-full shrink-0 overflow-hidden rounded-2xl border border-[#1e293b] md:w-80">
            <div className="bg-card relative h-20 overflow-hidden">
              <Glow
                colors={course?.color || '#22d3ee'}
                className="absolute top-1/2 -left-12 size-72 -translate-y-1/2 blur-3xl"
              />
            </div>

            <div className="px-5 pb-5">
              <Avatar className="-mt-10 h-20 w-20 ring-4 ring-[#111c30]">
                <AvatarFallback className="bg-[#1d293d] text-lg font-bold text-[#f8fafc]">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>

              <h3 className="mt-3 text-[17px] font-semibold text-[#f8fafc]">
                {user.name}
              </h3>
              <p className="text-[13px] text-[#90a1b9]">
                {course ? course.name : 'Nenhum curso vinculado'}
              </p>

              {currentRole && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#314158] bg-[#1d293d] px-2.5 py-1 text-[11px] text-[#cbd5e1]">
                    Matrícula {currentRole.registrationNumber || 'N/A'}
                  </span>
                  {currentRole.isVerified ? (
                    <span className="flex items-center gap-1 rounded-full bg-[#5be41b]/15 px-2.5 py-1 text-[11px] font-medium text-[#5be41b]">
                      <UserCheck className="size-3" /> Verificado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-500">
                      <ShieldAlert className="size-3" /> Pendente
                    </span>
                  )}
                </div>
              )}

              {course && (
                <div className="mt-5 grid grid-cols-3 divide-x divide-[#1e293b] rounded-xl border border-[#1e293b] bg-[#0d1726] py-3 text-center">
                  <div>
                    <p className="text-[15px] font-semibold text-[#f8fafc]">
                      --
                    </p>
                    <p className="text-[11px] text-[#90a1b9]">Período</p>
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#f8fafc]">
                      --
                    </p>
                    <p className="text-[11px] text-[#90a1b9]">IRA</p>
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#f8fafc]">
                      0%
                    </p>
                    <p className="text-[11px] text-[#90a1b9]">Concluído</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
