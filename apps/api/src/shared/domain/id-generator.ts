export interface IdGenerator {
  next(): string
}

export const ID_GENERATOR = Symbol('IdGenerator')
