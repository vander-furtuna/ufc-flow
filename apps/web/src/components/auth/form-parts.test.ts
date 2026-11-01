import { describe, expect, it, vi } from 'vitest'

import { applyProblem, safeNext } from './form-parts'

describe('safeNext', () => {
  it.each([
    ['/eng-computacao/2006-2', '/eng-computacao/2006-2'],
    [undefined, '/cursos'],
    ['', '/cursos'],
    ['https://evil.example', '/cursos'],
    ['//evil.example', '/cursos'],
    ['/\\evil.example', '/cursos'],
    ['cursos', '/cursos'],
  ])('%s -> %s', (next, expected) => {
    expect(safeNext(next)).toBe(expected)
  })
})

describe('applyProblem', () => {
  it('põe os erros de campos conhecidos no formulário', () => {
    const setError = vi.fn()
    const message = applyProblem(
      {
        code: 'VALIDATION_FAILED',
        detail: 'Confira os campos',
        errors: [
          { path: ['email'], message: 'E-mail inválido', code: 'custom' },
          { path: ['other'], message: 'ignorado', code: 'custom' },
        ],
      },
      ['email', 'password'],
      setError,
    )

    expect(message).toBeNull()
    expect(setError).toHaveBeenCalledOnce()
    expect(setError).toHaveBeenCalledWith('email', {
      message: 'E-mail inválido',
    })
  })

  it('devolve o detalhe quando nenhum campo casa', () => {
    expect(
      applyProblem(
        { code: 'EMAIL_TAKEN', detail: 'E-mail já cadastrado' },
        ['email'],
        vi.fn(),
      ),
    ).toBe('E-mail já cadastrado')
  })

  it('usa uma mensagem genérica sem detalhe', () => {
    expect(applyProblem({ code: 'X' }, ['email'], vi.fn())).toBe(
      'Não foi possível concluir. Tente de novo.',
    )
  })
})
