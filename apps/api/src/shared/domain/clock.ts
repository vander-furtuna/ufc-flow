// O domínio nunca usa new Date(): o tempo vem desta porta
export interface Clock {
  now(): Date
}

export const CLOCK = Symbol('Clock')
