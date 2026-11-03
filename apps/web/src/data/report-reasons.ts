import type { ReportReason } from '@ufc-flow/contracts'

// Motivos de denúncia e categorias públicas da remoção (modelagem, Fórum)
export const REPORT_REASONS: Record<ReportReason, string> = {
  SPAM: 'Spam',
  OFFENSIVE: 'Ofensiva',
  HARASSMENT: 'Assédio',
  PERSONAL_DATA: 'Dados pessoais',
  OFF_TOPIC: 'Fora do tema',
  OTHER: 'Outro motivo',
}
