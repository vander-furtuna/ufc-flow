// @vitest-environment jsdom
import type { MessageView, SubjectSearchResult } from '@ufc-flow/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const RESULTS: SubjectSearchResult[] = [
  {
    code: 'SBL0057',
    name: 'CÁLCULO DIFERENCIAL E INTEGRAL I',
    slug: 'sbl0057',
    inCurriculum: true,
    semester: 1,
    nature: 'MANDATORY',
    courseName: null,
  },
  {
    code: 'ECN0012',
    name: 'Cálculo Aplicado à Economia',
    slug: 'ecn0012',
    inCurriculum: false,
    semester: null,
    nature: null,
    courseName: 'CIÊNCIAS ECONÔMICAS',
  },
]

vi.mock('@/lib/forum/use-forum', () => ({
  useSubjectSearch: (_course: string, query: string | null) => ({
    data: query ? RESULTS : [],
  }),
  useUpdateMessage: () => vi.fn(),
  useInvalidateForum: () => vi.fn(),
}))
vi.mock('@/lib/forum/forum-actions', () => ({}))
vi.mock('@/lib/auth/use-session', () => ({
  useSession: () => ({ data: { id: 'me', name: 'Eu' } }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { Composer } from './composer'
import { MessageItem } from './message-item'

const wrap = (node: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      {node}
    </QueryClientProvider>,
  )

afterEach(cleanup)

describe('Composer', () => {
  it('@ abre a busca, as setas escolhem e Enter grava o token', async () => {
    const onSubmit = vi.fn(async () => true)
    const user = userEvent.setup()
    wrap(
      <Composer
        courseSlug="eng"
        curriculumLabel="EC 2006.2"
        placeholder="Escreva para o curso"
        submitLabel="Publicar"
        onSubmit={onSubmit}
      />,
    )
    const box = screen.getByLabelText('Escreva para o curso')
    await user.type(box, 'Lista de @calc')
    expect(await screen.findByText('Na sua grade · EC 2006.2')).toBeTruthy()
    expect(screen.getByText('Outros cursos')).toBeTruthy()
    expect(screen.getByText('SBL0057 · 1º período · Obrigatória')).toBeTruthy()
    await user.keyboard('{ArrowDown}{ArrowUp}{Enter}')
    expect((box as HTMLTextAreaElement).value).toBe('Lista de @SBL0057 ')
    expect(screen.queryByText('Outros cursos')).toBeNull()

    await user.type(box, 'e @calc')
    await screen.findByText('Outros cursos')
    await user.keyboard('{Escape}')
    expect(screen.queryByText('Outros cursos')).toBeNull()

    expect(screen.getByText('25/500')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Publicar' }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith('Lista de @SBL0057 e @calc'),
    )
    await waitFor(() => expect((box as HTMLTextAreaElement).value).toBe(''))
  })

  it('não publica vazio nem acima de 500 caracteres', async () => {
    const onSubmit = vi.fn(async () => true)
    wrap(
      <Composer
        courseSlug="eng"
        curriculumLabel={null}
        placeholder="Responder"
        submitLabel="Responder"
        initial={'a'.repeat(501)}
        onSubmit={onSubmit}
      />,
    )
    expect(
      screen
        .getByRole('button', { name: 'Responder' })
        .hasAttribute('disabled'),
    ).toBe(true)
  })
})

describe('MessageItem', () => {
  const message = (overrides: Partial<MessageView>): MessageView => ({
    id: '00000000-0000-4000-8000-000000000001',
    courseId: '00000000-0000-4000-8000-000000000002',
    parentId: null,
    rootId: null,
    author: { id: 'bruno', name: 'Bruno Lima', avatarFileId: null },
    replyingTo: null,
    content: 'A prova de @ECO0036 cobra escalonamento?',
    status: 'VISIBLE',
    removedBy: null,
    removalCategory: null,
    replyCount: 4,
    likeCount: 7,
    likedByMe: true,
    mentions: [
      { code: 'ECO0036', name: 'SISTEMAS OPERACIONAIS', slug: 'eco0036' },
    ],
    createdAt: '2026-11-03T12:00:00.000Z',
    editedAt: null,
    editableUntil: null,
    ...overrides,
  })
  const context = {
    courseSlug: 'eng',
    curriculumSlug: '2006-2',
    curriculumLabel: null,
    canPost: true,
  }
  const now = new Date('2026-11-03T12:12:00.000Z')

  it('chip da disciplina, curtida e menu de denúncia', () => {
    wrap(<MessageItem message={message({})} context={context} now={now} />)
    const chip = screen.getByRole('link', { name: '@Sistemas Operacionais' })
    expect(chip.getAttribute('href')).toBe('/eng/2006-2/ECO0036')
    expect(
      screen
        .getByRole('button', { name: 'Descurtir' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(screen.getByText('· 12 min')).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Abrir a conversa (4 respostas)' }),
    ).toBeTruthy()
  })

  it('removida pela moderação mostra só a categoria', () => {
    wrap(
      <MessageItem
        message={message({
          content: null,
          status: 'REMOVED',
          removedBy: 'MODERATION',
          removalCategory: 'PERSONAL_DATA',
          replyCount: 2,
          mentions: [],
        })}
        context={context}
        now={now}
      />,
    )
    expect(screen.getByText('Mensagem removida pela moderação')).toBeTruthy()
    expect(
      screen.getByText(
        'Motivo: dados pessoais · as 2 respostas continuam visíveis',
      ),
    ).toBeTruthy()
  })
})
