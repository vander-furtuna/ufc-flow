// Regras acadêmicas puras e testáveis, usadas pelo web, pela API e pela
// extensão. Sem dependência de framework nem de I/O.
export * from './search/normalize-search'
export * from './mentions/extract-mentions'
export * from './terms/term'
export * from './requirements/types'
export * from './requirements/parse-requirement'
export * from './requirements/format-requirement'
export * from './requirements/normalize-requirement'
export * from './requirements/collect-codes'
export * from './requirements/evaluate-requirement'
export * from './requirements/find-requirement-cycles'
