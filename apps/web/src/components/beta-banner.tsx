// Faixa do beta fechado (D101). Só aparece com BETA_FEEDBACK_URL definida no
// ambiente do beta; em produção, sem a variável, não renderiza nada.

// Só http(s): a URL vem do ambiente, mas um valor errado não vira link
export function betaFeedbackUrl(value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : null
  } catch {
    return null
  }
}

export function BetaBanner({ feedbackUrl }: { feedbackUrl: string }) {
  return (
    <aside
      aria-label="Versão beta"
      className="w-full bg-orange-500 px-4 py-2 text-center text-sm font-medium text-white"
    >
      Versão beta do UFC Flow v2: encontrou um erro ou tem uma sugestão?{' '}
      <a
        href={feedbackUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline underline-offset-2 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
      >
        Enviar feedback
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
    </aside>
  )
}
