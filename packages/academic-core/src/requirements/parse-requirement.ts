import { normalizeRequirement } from './normalize-requirement'
import type { RequirementExpr } from './types'

export type RequirementSyntaxErrorCode =
  | 'REQUIREMENT_INVALID_TOKEN'
  | 'REQUIREMENT_UNEXPECTED_TOKEN'
  | 'REQUIREMENT_UNEXPECTED_END'

export type RequirementSyntaxError = {
  code: RequirementSyntaxErrorCode
  message: string
  // Índice do caractere no texto original
  position: number
}

export type ParseRequirementResult =
  | { ok: true; expr: RequirementExpr | null }
  | { ok: false; error: RequirementSyntaxError }

type Token =
  | { type: 'code'; value: string; position: number }
  | { type: 'and' | 'or' | 'open' | 'close'; position: number }

// Código de disciplina: letras maiúsculas seguidas de dígitos (ECO0001, CK0211)
export const SUBJECT_CODE_PATTERN = /^[A-Z]+\d+$/
const WORD_PATTERN = /[A-Za-z0-9]+/y

class RequirementParseError extends Error {
  constructor(readonly detail: RequirementSyntaxError) {
    super(detail.message)
  }
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let index = 0

  while (index < text.length) {
    const char = text[index] as string

    if (/\s/.test(char)) {
      index++
    } else if (char === '(' || char === ')') {
      tokens.push({ type: char === '(' ? 'open' : 'close', position: index })
      index++
    } else {
      WORD_PATTERN.lastIndex = index
      const word = WORD_PATTERN.exec(text)?.[0]
      const upper = word?.toUpperCase()

      if (upper === 'E' || upper === 'OU') {
        tokens.push({ type: upper === 'E' ? 'and' : 'or', position: index })
      } else if (word && SUBJECT_CODE_PATTERN.test(word)) {
        tokens.push({ type: 'code', value: word, position: index })
      } else {
        throw new RequirementParseError({
          code: 'REQUIREMENT_INVALID_TOKEN',
          message: `Trecho inválido "${word ?? char}" na posição ${index}`,
          position: index,
        })
      }
      index += word?.length ?? 1
    }
  }

  return tokens
}

// ou := e ('OU' e)* · e := átomo ('E' átomo)* · átomo := CÓDIGO | '(' ou ')'
class Parser {
  private index = 0

  constructor(
    private readonly tokens: Token[],
    private readonly length: number,
  ) {}

  parse(): RequirementExpr {
    const expr = this.parseOr()
    const extra = this.tokens[this.index]
    if (extra) this.unexpected(extra)
    return expr
  }

  private parseOr(): RequirementExpr {
    const items = [this.parseAnd()]
    while (this.tokens[this.index]?.type === 'or') {
      this.index++
      items.push(this.parseAnd())
    }
    return { kind: 'or', items }
  }

  private parseAnd(): RequirementExpr {
    const items = [this.parseAtom()]
    while (this.tokens[this.index]?.type === 'and') {
      this.index++
      items.push(this.parseAtom())
    }
    return { kind: 'and', items }
  }

  private parseAtom(): RequirementExpr {
    const token = this.tokens[this.index]
    if (!token) return this.unexpectedEnd()

    if (token.type === 'code') {
      this.index++
      return { kind: 'subject', code: token.value }
    }

    if (token.type === 'open') {
      this.index++
      const expr = this.parseOr()
      const close = this.tokens[this.index]
      if (!close) return this.unexpectedEnd()
      if (close.type !== 'close') this.unexpected(close)
      this.index++
      return expr
    }

    return this.unexpected(token)
  }

  private unexpected(token: Token): never {
    throw new RequirementParseError({
      code: 'REQUIREMENT_UNEXPECTED_TOKEN',
      message: `Elemento inesperado na posição ${token.position}`,
      position: token.position,
    })
  }

  private unexpectedEnd(): never {
    throw new RequirementParseError({
      code: 'REQUIREMENT_UNEXPECTED_END',
      message: 'O requisito terminou antes do esperado',
      position: this.length,
    })
  }
}

// Lê o texto do SIGAA, como "( ECO0018 E ( SBL0084 OU CEC0022 ) )".
// E tem precedência sobre OU. Texto vazio significa sem requisito.
export function parseRequirement(text: string): ParseRequirementResult {
  try {
    const tokens = tokenize(text)
    if (tokens.length === 0) return { ok: true, expr: null }

    const expr = new Parser(tokens, text.length).parse()
    return { ok: true, expr: normalizeRequirement(expr) }
  } catch (error) {
    if (error instanceof RequirementParseError)
      return { ok: false, error: error.detail }
    throw error
  }
}
