import type { LinkOrderInput, ManagedLinkPage } from '@ufc-flow/contracts'

type TreeLink = { id: string; sectionId: string | null; isFeatured: boolean }
type Section = { id: string; title: string }

export type LinkTree<L> = {
  featured: L | null
  top: L[]
  sections: (Section & { links: L[] })[]
}

// Como a página mostra os links: o destaque no topo, depois os sem seção e
// as seções na ordem (as vazias somem). Os links já vêm em ordem.
export function groupLinks<L extends TreeLink>(
  links: L[],
  sections: Section[],
): LinkTree<L> {
  const featured = links.find((link) => link.isFeatured) ?? null
  const rest = links.filter((link) => link !== featured)
  return {
    featured,
    top: rest.filter((link) => link.sectionId === null),
    sections: sections
      .map((section) => ({
        ...section,
        links: rest.filter((link) => link.sectionId === section.id),
      }))
      .filter((section) => section.links.length > 0),
  }
}

type ManagedLink = ManagedLinkPage['links'][number]
type ManagedSection = ManagedLinkPage['sections'][number]

const byPosition = <T extends { position: number }>(items: T[]) =>
  [...items].sort((a, b) => a.position - b.position)

// Grupos do editor: os sem seção primeiro e cada seção, mesmo vazia
export function editorGroups(
  page: ManagedLinkPage,
): { section: ManagedSection | null; links: ManagedLink[] }[] {
  const links = byPosition(page.links)
  return [
    { section: null, links: links.filter((link) => link.sectionId === null) },
    ...byPosition(page.sections).map((section) => ({
      section,
      links: links.filter((link) => link.sectionId === section.id),
    })),
  ]
}

// Pré-visualização: só o que está no ar (link ativo, seção visível)
export function previewOf(page: ManagedLinkPage): {
  links: ManagedLink[]
  sections: Section[]
} {
  const sections = byPosition(page.sections).filter(
    (section) => section.isVisible,
  )
  const visible = new Set(sections.map((section) => section.id))
  const links = editorGroups(page)
    .flatMap((group) => group.links)
    .filter(
      (link) =>
        link.status === 'ACTIVE' &&
        (link.sectionId === null || visible.has(link.sectionId)),
    )
  return { links, sections }
}

export function orderInput(page: ManagedLinkPage): LinkOrderInput {
  return {
    sections: byPosition(page.sections).map((section) => section.id),
    links: editorGroups(page).flatMap((group) =>
      group.links.map((link) => ({ id: link.id, sectionId: link.sectionId })),
    ),
    socialLinks: byPosition(page.socialLinks).map((social) => social.id),
  }
}

// Leva `from` para o lugar de `to` (o resultado de arrastar)
export function moveItem(ids: string[], from: string, to: string): string[] {
  const start = ids.indexOf(from)
  const end = ids.indexOf(to)
  if (start < 0 || end < 0 || start === end) return ids
  const next = [...ids]
  next.splice(start, 1)
  next.splice(end, 0, from)
  return next
}
