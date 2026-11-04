'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'

import { PageHeader } from '../_components/page-header'
import {
  RequestCard,
  RestrictionCard,
} from '@/components/moderation/moderation-lists'
import { ReportCard } from '@/components/moderation/report-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useModerationSummary,
  usePendingRequests,
  useReportQueue,
  useRestrictions,
} from '@/lib/moderation/use-moderation'
import { cn } from '@/lib/utils'

const TABS = ['denuncias', 'pedidos', 'restricoes'] as const
type Tab = (typeof TABS)[number]

const trigger =
  'h-10 rounded-full border px-4 font-semibold data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'

function State<T>({
  query,
  empty,
  children,
}: {
  query: {
    isPending: boolean
    isError: boolean
    error: Error | null
    data?: T[]
  }
  empty: string
  children: (items: T[]) => ReactNode
}) {
  if (query.isPending) {
    return (
      <div
        aria-hidden
        className="h-40 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
      />
    )
  }
  if (query.isError) {
    return (
      <p role="alert" className="rounded-2xl border p-6 text-sm">
        {query.error?.message}
      </p>
    )
  }
  if (!query.data || query.data.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    )
  }
  return <div className="flex flex-col gap-4">{children(query.data)}</div>
}

// Admin › Moderação (mockups Admin-Moderacao e Mobile-Admin-Moderacao):
// denúncias, pedidos de moderação (só admin) e restrições ativas
export function ModerationPage({
  isAdmin,
  scope,
}: {
  isAdmin: boolean
  scope: string
}) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const requested = params.get('aba') as Tab | null
  const tab: Tab =
    requested &&
    TABS.includes(requested) &&
    (requested !== 'pedidos' || isAdmin)
      ? requested
      : 'denuncias'

  const summary = useModerationSummary()
  const reports = useReportQueue()
  const restrictions = useRestrictions()
  const requests = usePendingRequests(isAdmin)
  const counts = summary.data

  // A aba fica no endereço (a notificação de pedido abre direto nela)
  const select = (value: string) =>
    router.replace(`${pathname}?aba=${value}`, { scroll: false })
  const count = (value: number | null | undefined) =>
    value === undefined || value === null ? '' : ` · ${value}`

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        title="Moderação"
        description={`Denúncias do fórum${isAdmin ? ', pedidos para moderar cursos' : ''} e restrições ativas · ${scope}.`}
      />
      <Tabs value={tab} onValueChange={select} className="flex flex-col gap-4">
        <TabsList className="-mx-4 h-auto w-auto [scrollbar-width:none] justify-start gap-2 overflow-x-auto bg-transparent px-4 sm:mx-0 sm:px-0">
          <TabsTrigger value="denuncias" className={trigger}>
            Denúncias{count(counts?.openReports)}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="pedidos" className={trigger}>
              Pedidos de moderação{count(counts?.pendingRequests)}
            </TabsTrigger>
          )}
          <TabsTrigger value="restricoes" className={cn(trigger)}>
            Restrições{count(counts?.activeRestrictions)}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="denuncias" className="mt-0">
          <State
            query={reports}
            empty="Nenhuma denúncia aberta. Tudo em ordem."
          >
            {(items) =>
              items.map((item) => (
                <ReportCard key={item.messageId} item={item} />
              ))
            }
          </State>
        </TabsContent>
        {isAdmin && (
          <TabsContent value="pedidos" className="mt-0">
            <State
              query={requests}
              empty="Nenhum pedido de moderação pendente."
            >
              {(items) =>
                items.map((item) => (
                  <RequestCard key={item.id} request={item} />
                ))
              }
            </State>
          </TabsContent>
        )}
        <TabsContent value="restricoes" className="mt-0">
          <State
            query={restrictions}
            empty="Ninguém silenciado ou banido agora."
          >
            {(items) =>
              items.map((item) => (
                <RestrictionCard key={item.id} restriction={item} />
              ))
            }
          </State>
        </TabsContent>
      </Tabs>
    </div>
  )
}
