// @vitest-environment jsdom
import type { MessageView } from '@ufc-flow/contracts'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/moderation/moderation-actions', () => ({}))
vi.mock('@/lib/moderation/use-moderation', () => ({
  useRefreshModeration: () => vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { moderationActionsFor } from './message-moderation'
import { ModerationDialog } from './moderation-dialog'

afterEach(cleanup)

const message = (overrides: Partial<MessageView>): MessageView => ({
  id: '00000000-0000-4000-8000-000000000001',
  courseId: '00000000-0000-4000-8000-000000000002',
  parentId: null,
  rootId: null,
  author: { id: 'ana', name: 'Ana', avatarFileId: null },
  replyingTo: null,
  content: 'Oi',
  status: 'VISIBLE',
  removedBy: null,
  removalCategory: null,
  replyCount: 0,
  likeCount: 0,
  likedByMe: false,
  mentions: [],
  createdAt: '2026-11-03T12:00:00.000Z',
  editedAt: null,
  editableUntil: null,
  ...overrides,
})

describe('moderationActionsFor', () => {
  it.each([
    [{}, ['HIDE', 'REMOVE', 'RESTRICT']],
    [{ status: 'HIDDEN' as const }, ['RESTORE', 'REMOVE', 'RESTRICT']],
    [
      { status: 'REMOVED' as const, removedBy: 'MODERATION' as const },
      ['RESTORE', 'RESTRICT'],
    ],
    // A apagada pelo autor não volta; conta excluída não se restringe
    [
      {
        status: 'REMOVED' as const,
        removedBy: 'AUTHOR' as const,
        author: null,
      },
      [],
    ],
  ])('%o', (overrides, expected) => {
    expect(moderationActionsFor(message(overrides))).toEqual(expected)
  })
})

describe('ModerationDialog', () => {
  it('remover pede o motivo e a categoria; silenciar é opcional', async () => {
    const onConfirm = vi.fn(async () => true)
    const user = userEvent.setup()
    render(
      <ModerationDialog
        open
        onOpenChange={vi.fn()}
        title="Remover mensagem"
        description="Os leitores veem só a categoria."
        confirmLabel="Remover"
        destructive
        category="PERSONAL_DATA"
        restriction="optional"
        onConfirm={onConfirm}
      />,
    )
    const confirm = screen.getByRole('button', { name: 'Remover' })
    expect(confirm.hasAttribute('disabled')).toBe(true)
    expect(
      (
        screen.getByLabelText(
          'Categoria (aparece para os leitores)',
        ) as HTMLSelectElement
      ).value,
    ).toBe('PERSONAL_DATA')
    await user.selectOptions(screen.getByLabelText('Silenciar o autor'), '7')
    await user.type(
      screen.getByLabelText('Motivo (fica no registro da moderação)'),
      'Telefone da monitora',
    )
    await user.click(confirm)
    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith({
        reason: 'Telefone da monitora',
        category: 'PERSONAL_DATA',
        restriction: { type: 'MUTE', days: 7 },
      }),
    )
  })

  it('restrição obrigatória: banir sem prazo', async () => {
    const onConfirm = vi.fn(async () => true)
    const user = userEvent.setup()
    render(
      <ModerationDialog
        open
        onOpenChange={vi.fn()}
        title="Restringir Ana"
        description="Vale só neste curso."
        confirmLabel="Restringir"
        restriction="required"
        onConfirm={onConfirm}
      />,
    )
    expect(screen.queryByRole('option', { name: 'Não silenciar' })).toBeNull()
    await user.click(screen.getByText('Banir'))
    await user.selectOptions(
      screen.getByLabelText('Por quanto tempo'),
      'forever',
    )
    await user.type(
      screen.getByLabelText('Motivo (fica no registro da moderação)'),
      'Assédio',
    )
    await user.click(screen.getByRole('button', { name: 'Restringir' }))
    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith({
        reason: 'Assédio',
        category: null,
        restriction: { type: 'BAN', days: null },
      }),
    )
  })
})
