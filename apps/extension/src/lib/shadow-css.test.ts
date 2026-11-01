import { describe, expect, it } from 'vitest'

import { withPropertyFallbacks } from './shadow-css'

const css = `
.shadow { box-shadow: var(--tw-shadow); }
@property --tw-shadow { syntax: "*"; inherits: false; initial-value: 0 0 #0000; }
@property --tw-border-style {
  syntax: "*";
  inherits: false;
  initial-value: solid;
}
@property --tw-rotate-x { syntax: "*"; inherits: false; }
`

describe('withPropertyFallbacks', () => {
  it('repete os valores iniciais do @property como variáveis comuns', () => {
    const result = withPropertyFallbacks(css)
    expect(result.startsWith(css)).toBe(true)
    expect(result).toContain(
      ':host, *, ::before, ::after, ::backdrop { --tw-shadow: 0 0 #0000; --tw-border-style: solid; }',
    )
  })

  it('lê o CSS minificado, sem ponto e vírgula no fim', () => {
    expect(
      withPropertyFallbacks(
        '@property --tw-border-style{syntax:"*";inherits:false;initial-value:solid}',
      ),
    ).toContain('{ --tw-border-style: solid; }')
  })

  it('não acrescenta nada sem @property com valor inicial', () => {
    expect(withPropertyFallbacks('.a { color: red; }')).toBe(
      '.a { color: red; }',
    )
  })
})
