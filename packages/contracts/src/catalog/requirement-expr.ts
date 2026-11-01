import {
  normalizeRequirement,
  type RequirementExpr,
} from '@ufc-flow/academic-core'
import { z } from 'zod'

import { subjectCodeSchema } from '../common/primitives'

const NOT_NORMALIZED =
  'A expressão não está normalizada: use normalizeRequirement do academic-core'

const groupItems = () =>
  z
    .array(requirementNodeSchema)
    .min(2, `${NOT_NORMALIZED} (grupo com menos de dois itens)`)

// Nó da árvore sem a checagem completa de forma normalizada, feita só na
// raiz. Os getters tornam o schema recursivo de um jeito que o
// z.toJSONSchema converte em $ref.
const requirementNodeSchema: z.ZodType<RequirementExpr> = z
  .discriminatedUnion('kind', [
    z
      .object({ kind: z.literal('subject'), code: subjectCodeSchema })
      .meta({ id: 'RequirementSubject' }),
    z
      .object({
        kind: z.literal('and'),
        get items() {
          return groupItems()
        },
      })
      .meta({ id: 'RequirementAnd' }),
    z
      .object({
        kind: z.literal('or'),
        get items() {
          return groupItems()
        },
      })
      .meta({ id: 'RequirementOr' }),
  ])
  .meta({ id: 'RequirementExpr' })

const isNormalized = (expr: RequirementExpr) =>
  JSON.stringify(normalizeRequirement(expr)) === JSON.stringify(expr)

// Pré-requisito, co-requisito ou equivalência como árvore de E/OU, sempre
// na forma normalizada do academic-core (D21): grupos com dois ou mais itens,
// sem grupo dentro de grupo do mesmo tipo e sem repetição.
export const requirementExprSchema = requirementNodeSchema.refine(
  isNormalized,
  { message: NOT_NORMALIZED },
)
