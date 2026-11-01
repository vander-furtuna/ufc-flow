import { randomUUID } from 'node:crypto'

import type { IdGenerator } from '../domain/id-generator'

export class RandomIdGenerator implements IdGenerator {
  next() {
    return randomUUID()
  }
}
