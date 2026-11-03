import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { OpenAPIObject } from '@nestjs/swagger'
import { beforeAll, describe, expect, it } from 'vitest'

import { openApiDocument } from './openapi-document'

type Operation = {
  summary?: string
  security?: unknown[]
  responses?: Record<string, unknown>
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const

// Toda rota precisa estar documentada (D17): o CI falha aqui se faltar
describe('documento OpenAPI', () => {
  let document: OpenAPIObject
  let operations: [string, Operation][]

  beforeAll(async () => {
    document = await openApiDocument()
    operations = Object.entries(document.paths).flatMap(([path, item]) =>
      METHODS.flatMap((method) => {
        const operation = (item as Record<string, Operation | undefined>)[
          method
        ]
        return operation ? [[`${method.toUpperCase()} ${path}`, operation]] : []
      }),
    ) as [string, Operation][]
  })

  it('tem rotas na v1', () => {
    expect(operations.length).toBeGreaterThan(10)
    expect(operations.every(([name]) => name.includes(' /v1/'))).toBe(true)
  })

  it('toda rota tem resumo e resposta de sucesso', () => {
    const missing = operations
      .filter(
        ([, operation]) =>
          !operation.summary ||
          // Redirecionamento (3xx) também é sucesso
          !Object.keys(operation.responses ?? {}).some((status) =>
            /^[23]/.test(status),
          ),
      )
      .map(([name]) => name)
    expect(missing).toEqual([])
  })

  it('toda rota protegida documenta o 401 em Problem Details', () => {
    const missing = operations
      .filter(
        ([, operation]) =>
          (operation.security?.length ?? 0) > 0 &&
          !operation.responses?.['401'],
      )
      .map(([name]) => name)
    expect(missing).toEqual([])
  })

  it('toda referência aponta para um schema existente', () => {
    const schemas = document.components?.schemas ?? {}
    const refs = [
      ...JSON.stringify(document).matchAll(
        /"\$ref":"#\/components\/schemas\/([^"]+)"/g,
      ),
    ].map((match) => match[1]!)
    expect(refs.filter((ref) => !(ref in schemas))).toEqual([])
  })

  it('o openapi.json versionado está atualizado', () => {
    const committed = readFileSync(join(process.cwd(), 'openapi.json'), 'utf8')
    expect(
      JSON.parse(committed),
      'Rode `pnpm --filter @ufc-flow/api openapi` e commite o openapi.json',
    ).toEqual(JSON.parse(JSON.stringify(document)))
  })
})
