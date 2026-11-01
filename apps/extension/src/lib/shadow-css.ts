// O Tailwind 4 registra variáveis com @property, e o Chrome ignora @property
// dentro de Shadow DOM: sem valor inicial, sombras, anéis e bordas do painel
// injetado no SIGAA quebram. Repete os valores iniciais como variáveis comuns.
export function withPropertyFallbacks(css: string): string {
  const declarations = Array.from(
    css.matchAll(/@property\s+(--[\w-]+)\s*\{([^}]*)\}/g),
    ([, name, body]) => {
      // No CSS minificado a última declaração vem sem ";"
      const initial = /initial-value:\s*([^;]+)/.exec(body ?? '')?.[1]
      return initial === undefined ? null : `${name}: ${initial.trim()};`
    },
  ).filter((item) => item !== null)

  if (declarations.length === 0) return css
  return `${css}\n:host, *, ::before, ::after, ::backdrop { ${declarations.join(' ')} }`
}
