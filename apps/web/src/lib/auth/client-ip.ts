// IP de quem acessa o site, repassado à API (limite de tentativas e
// sessions.ip). Atrás do proxy do Coolify, o x-forwarded-for chega como
// "<o que o cliente mandou>, <IP visto pelo proxy>": só o último é
// confiável, porque o começo pode ser forjado (Lacunas e riscos).
export function clientIpFrom(header: string | null | undefined) {
  const hops = (header ?? '')
    .split(',')
    .map((hop) => hop.trim())
    .filter(Boolean)
  return hops.at(-1) ?? null
}
