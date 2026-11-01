import { Ajv2020 } from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import * as contracts from './index'
import { toJsonSchema, toOpenApiComponents } from './json-schema'

const ajv = new Ajv2020({ allErrors: true })
addFormats(ajv)

const exportedSchemas = Object.entries(
  contracts as Record<string, unknown>,
).filter((entry): entry is [string, z.ZodType] => entry[1] instanceof z.ZodType)

// O JSON Schema não carrega refinamentos (forma normalizada, coerência do
// arquivo, término depois do início); por isso os inválidos daqui são
// estruturais. Os refinamentos são testados nos testes de cada schema.
const examples: [z.ZodType, unknown, unknown][] = [
  [
    contracts.requirementExprSchema,
    {
      kind: 'or',
      items: [
        { kind: 'subject', code: 'SBL0080' },
        { kind: 'subject', code: 'EEL0072' },
      ],
    },
    { kind: 'or', items: [{ kind: 'subject', code: 'sbl0080' }] },
  ],
  [
    contracts.problemDetailsSchema,
    {
      type: contracts.problemType('NOT_FOUND'),
      title: 'Não encontrado',
      status: 404,
      code: 'NOT_FOUND',
    },
    { title: 'Sem tipo', status: 200, code: 'x' },
  ],
  [
    contracts.postInputSchema,
    {
      type: 'NEWS',
      title: 'Aviso',
      summary: null,
      bodyMd: 'Texto',
      coverFileId: null,
      externalUrl: null,
      status: 'DRAFT',
      pinned: false,
      startsAt: null,
      endsAt: null,
      deadlineAt: null,
      location: null,
      attributes: {},
    },
    { type: 'EVENT', title: 'Sem início', attributes: {} },
  ],
  [contracts.cursorPageQuerySchema, { limit: 20 }, { limit: 0 }],
]

describe('toJsonSchema', () => {
  it.each(exportedSchemas)('converte %s', (_, schema) => {
    expect(() => toJsonSchema(schema)).not.toThrow()
  })

  it.each(examples)(
    'o JSON Schema aceita o válido e recusa o inválido (%#)',
    (schema, valid, invalid) => {
      const validate = ajv.compile(toJsonSchema(schema))
      expect(schema.safeParse(valid).success).toBe(true)
      expect(validate(valid)).toBe(true)
      expect(schema.safeParse(invalid).success).toBe(false)
      expect(validate(invalid)).toBe(false)
    },
  )

  it('descreve a importação de EC com os mesmos campos obrigatórios', () => {
    const schema = toJsonSchema(contracts.curriculumImportV1Schema)
    expect(schema.$ref).toBe('#/$defs/CurriculumImportV1')
    expect(schema.$defs).toHaveProperty('CurriculumImportV1')
    expect(
      (schema.$defs as Record<string, unknown>).CurriculumImportV1,
    ).toMatchObject({
      required: [
        'schemaVersion',
        'source',
        'course',
        'curriculum',
        'branches',
        'subjects',
      ],
      additionalProperties: false,
    })
  })
})

describe('toOpenApiComponents', () => {
  const components = toOpenApiComponents()

  it('tem um componente por schema nomeado', () => {
    expect(Object.keys(components)).toEqual(
      expect.arrayContaining([
        'RequirementExpr',
        'CurriculumImportV1',
        'ProblemDetails',
        'ValidationError',
        'PostInput',
        'RecordStatus',
        'LinkPageTheme',
      ]),
    )
  })

  it('aponta as referências para #/components/schemas', () => {
    const refs = JSON.stringify(components).match(/"\$ref":"[^"]+"/g) ?? []
    expect(refs.length).toBeGreaterThan(0)
    for (const ref of refs) {
      expect(ref).toMatch(/^"\$ref":"#\/components\/schemas\/[A-Za-z0-9]+"$/)
    }
  })

  it('usa o dialeto do OpenAPI 3.0 (nullable em vez de type null)', () => {
    const subject = JSON.stringify(components.CurriculumImportV1)
    expect(subject).toContain('"nullable":true')
    expect(subject).not.toContain('"type":"null"')
    expect(JSON.stringify(components)).not.toMatch(/"\$(id|schema)"/)
  })
})
