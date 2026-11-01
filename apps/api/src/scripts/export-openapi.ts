import { writeFileSync } from 'node:fs'

import { openApiJson } from './openapi-document'

// Gera apps/api/openapi.json, versionado: mudanças de contrato aparecem no
// diff do PR, e o teste do OpenAPI falha se o arquivo ficar desatualizado.
//   pnpm --filter @ufc-flow/api openapi
const json = await openApiJson()
writeFileSync(new URL('../../openapi.json', import.meta.url), json)
console.log('openapi.json atualizado')
