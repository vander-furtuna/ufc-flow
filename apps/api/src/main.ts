import { Logger } from '@nestjs/common'

import { parseEnv } from './config/env'
import { createApp } from './create-app'

const env = parseEnv(process.env)
const app = await createApp(env)
await app.listen(env.PORT)
Logger.log(
  `API em http://localhost:${env.PORT}${env.SWAGGER_ENABLED ? ' (Swagger em /docs)' : ''}`,
  'Bootstrap',
)
