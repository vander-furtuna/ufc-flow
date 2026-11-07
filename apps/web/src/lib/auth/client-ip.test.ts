import { describe, expect, it } from 'vitest'

import { clientIpFrom } from './client-ip'

describe('clientIpFrom', () => {
  it.each([
    ['sem cabeçalho', null, null],
    ['vazio', '  ', null],
    ['um endereço', '200.19.1.10', '200.19.1.10'],
    // O proxy acrescenta o IP real no fim; o começo vem do cliente e pode
    // ser forjado
    ['forjado pelo cliente', '1.2.3.4, 200.19.1.10', '200.19.1.10'],
    ['com espaços e vazios', '1.2.3.4 ,, 200.19.1.10 ', '200.19.1.10'],
  ])('%s', (_, header, expected) => {
    expect(clientIpFrom(header)).toBe(expected)
  })
})
