import '~styles/generated.css'
import '~styles/fonts.css'

import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  LayoutGrid,
  Lock,
  Search,
  Send,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import { Button, Chip, Logo } from './components/ui'
import { FLOW_SYNC_ENABLED, FLOW_URL, SIGAA_CURRICULA_URL } from './lib/config'
import { downloadText } from './lib/download'
import type {
  ContentMessage,
  JsonResponse,
  SummaryResponse,
} from './lib/messages'

// O popup acompanha o tema do sistema (o painel no SIGAA fica claro)
document.documentElement.classList.add('theme-auto')

type Screen = 'loading' | 'start' | 'detected' | 'login'

async function sendToTab<T>(message: ContentMessage): Promise<T | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id === undefined) return null
  try {
    return (await chrome.tabs.sendMessage(tab.id, message)) as T
  } catch {
    // Aba sem o content script (fora do SIGAA)
    return null
  }
}

function Header() {
  return (
    <header className="flex items-center gap-3">
      <Logo />
      <div>
        <p className="font-clash text-lg leading-tight font-semibold">
          UFC Flow
        </p>
        <p className="text-muted-foreground text-xs">
          Extrator de grades do SIGAA
        </p>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <p className="text-muted-foreground mt-auto text-center text-xs">
      v{chrome.runtime.getManifest().version} · os dados lidos ficam no seu
      navegador até você enviar
    </p>
  )
}

const STEPS = [
  'Entre no SIGAA com seu login.',
  'Em Currículos, busque o curso e clique na lupa da estrutura.',
  'Use o botão Extrair grade que aparece no canto da página.',
]

function Start({ onLogin }: { onLogin: () => void }) {
  return (
    <>
      <Header />
      <div className="border-border bg-card flex gap-3 rounded-2xl border p-4">
        <span className="border-border bg-background flex size-10 shrink-0 items-center justify-center rounded-xl border">
          <Search className="size-4" aria-hidden />
        </span>
        <p className="text-sm">
          <strong>Nenhuma grade nesta aba.</strong> Abra a estrutura curricular
          de um curso no SIGAA.
        </p>
      </div>
      <ol className="flex flex-col gap-3">
        {STEPS.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm">
            <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <Button
        onClick={() => {
          void chrome.tabs.create({ url: SIGAA_CURRICULA_URL })
        }}
      >
        Abrir currículos no SIGAA
        <ExternalLink className="size-4" aria-hidden />
      </Button>
      {FLOW_SYNC_ENABLED && (
        <button
          type="button"
          onClick={onLogin}
          className="border-border hover:bg-muted mt-4 flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium"
        >
          Moderador? Entre para enviar ao Flow
          <ChevronRight className="size-4" aria-hidden />
        </button>
      )}
    </>
  )
}

function Detected({ response }: { response: NonNullable<SummaryResponse> }) {
  const { summary, exportable } = response
  const stats = [
    [summary.components, 'componentes', ''],
    [summary.branches, 'vertentes', ''],
    [summary.toReview, 'para revisar', 'text-orange-700'],
  ] as const

  const openPanel = async () => {
    await sendToTab({ type: 'OPEN_PANEL' })
    window.close()
  }
  const download = async () => {
    const file = await sendToTab<JsonResponse>({ type: 'GET_JSON' })
    if (file) downloadText(file.json, file.fileName)
  }

  return (
    <>
      <Header />
      <section className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-4">
        <p className="flex items-center gap-2 text-xs font-medium text-green-700">
          <span aria-hidden className="size-2 rounded-full bg-green-500" />
          Estrutura curricular nesta aba
        </p>
        <h1 className="font-clash text-2xl leading-tight font-semibold">
          {summary.courseName}
        </h1>
        <div className="flex flex-wrap gap-1.5">
          <Chip>EC {summary.code}</Chip>
          <Chip>{summary.city}</Chip>
          {summary.sigaaId && <Chip mono>SIGAA {summary.sigaaId}</Chip>}
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {stats.map(([value, label, color]) => (
            <div
              key={label}
              className="border-border bg-background rounded-xl border p-2.5"
            >
              <dd className="font-clash text-xl font-semibold">{value}</dd>
              <dt className={`text-muted-foreground text-xs ${color}`}>
                {label}
              </dt>
            </div>
          ))}
        </dl>
      </section>
      <Button onClick={openPanel}>
        <LayoutGrid className="size-4" aria-hidden />
        Abrir painel da grade
      </Button>
      <div className="grid grid-flow-col gap-2">
        {FLOW_SYNC_ENABLED && (
          <Button variant="outline" onClick={openPanel}>
            <Send className="size-4" aria-hidden />
            Enviar ao Flow
          </Button>
        )}
        <Button variant="outline" disabled={!exportable} onClick={download}>
          <Download className="size-4" aria-hidden />
          Baixar JSON
        </Button>
      </div>
      {!exportable && (
        <p className="text-muted-foreground text-xs">
          Abra o painel e resolva os itens da aba Revisar para liberar o JSON.
        </p>
      )}
    </>
  )
}

function Login({ onBack }: { onBack: () => void }) {
  const [message, setMessage] = useState<string | null>(null)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setMessage('O login chega junto com a API do Flow.')
  }

  return (
    <>
      <header className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="w-9 px-0"
          onClick={onBack}
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Button>
        <Logo className="size-7" />
        <span className="font-clash text-lg font-semibold">UFC Flow</span>
      </header>
      <div>
        <h1 className="font-clash text-2xl font-semibold">
          Entre com sua conta do Flow
        </h1>
        <p className="text-muted-foreground text-sm">
          Só moderadores e administradores enviam grades. Sem conta, você ainda
          pode baixar o JSON.
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          E-mail
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="voce@alu.ufc.br"
            className="border-border bg-background h-11 rounded-xl border px-3 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Senha
          <input
            type="password"
            required
            autoComplete="current-password"
            className="border-border bg-background h-11 rounded-xl border px-3 font-normal"
          />
        </label>
        <Button type="submit" className="h-11">
          Entrar
        </Button>
        {message && (
          <output className="text-sm text-amber-700">{message}</output>
        )}
      </form>
      <p className="bg-card text-muted-foreground flex gap-2 rounded-xl p-3 text-xs">
        <Lock className="size-4 shrink-0" aria-hidden />A sessão fica guardada
        só nesta extensão. Seu login do SIGAA nunca é lido nem enviado.
      </p>
      <a
        href={FLOW_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-auto text-center text-sm underline"
      >
        Não tem conta? Crie em flow.ufc.br
      </a>
    </>
  )
}

export default function Popup() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [response, setResponse] = useState<SummaryResponse>(null)

  useEffect(() => {
    void sendToTab<SummaryResponse>({ type: 'GET_SUMMARY' }).then((result) => {
      setResponse(result)
      setScreen(result ? 'detected' : 'start')
    })
  }, [])

  return (
    <main className="bg-background text-foreground flex min-h-[560px] w-[360px] flex-col gap-4 p-5 font-sans">
      {screen === 'start' && <Start onLogin={() => setScreen('login')} />}
      {screen === 'detected' && response && <Detected response={response} />}
      {screen === 'login' && <Login onBack={() => setScreen('start')} />}
      {screen !== 'login' && screen !== 'loading' && <Footer />}
    </main>
  )
}
