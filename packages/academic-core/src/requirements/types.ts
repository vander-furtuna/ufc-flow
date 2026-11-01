// Pré-requisito, co-requisito ou equivalência do SIGAA como árvore de E/OU.
// Referencia códigos, não IDs: o SIGAA cita disciplinas que podem não estar
// importadas no catálogo.
export type RequirementExpr =
  | { kind: 'subject'; code: string }
  | { kind: 'and'; items: RequirementExpr[] }
  | { kind: 'or'; items: RequirementExpr[] }
