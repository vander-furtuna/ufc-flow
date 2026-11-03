import type { SocialNetwork } from '@ufc-flow/contracts'
import {
  BookOpenIcon,
  CalendarBlankIcon,
  ChatCircleIcon,
  CodeIcon,
  EnvelopeSimpleIcon,
  FileTextIcon,
  GlobeIcon,
  GraduationCapIcon,
  InstagramLogoIcon,
  LinkSimpleIcon,
  MapPinIcon,
  MegaphoneIcon,
  NewspaperIcon,
  SquaresFourIcon,
  UsersIcon,
  WhatsappLogoIcon,
  YoutubeLogoIcon,
} from '@phosphor-icons/react/ssr'
import type { IconProps } from '@phosphor-icons/react'
import type { ComponentType } from 'react'

// Ícones que o moderador escolhe para cada link (`course_links.icon`)
export const LINK_ICONS: Record<
  string,
  { label: string; Icon: ComponentType<IconProps> }
> = {
  megaphone: { label: 'Megafone', Icon: MegaphoneIcon },
  'graduation-cap': { label: 'Capelo', Icon: GraduationCapIcon },
  calendar: { label: 'Calendário', Icon: CalendarBlankIcon },
  file: { label: 'Documento', Icon: FileTextIcon },
  users: { label: 'Pessoas', Icon: UsersIcon },
  book: { label: 'Livro', Icon: BookOpenIcon },
  chat: { label: 'Conversa', Icon: ChatCircleIcon },
  newspaper: { label: 'Notícia', Icon: NewspaperIcon },
  grid: { label: 'Grade', Icon: SquaresFourIcon },
  code: { label: 'Código', Icon: CodeIcon },
  'map-pin': { label: 'Local', Icon: MapPinIcon },
  globe: { label: 'Site', Icon: GlobeIcon },
}

export function LinkIcon({
  icon,
  ...props
}: Omit<IconProps, 'name'> & { icon: string | null }) {
  const Icon = (icon && LINK_ICONS[icon]?.Icon) || LinkSimpleIcon
  return <Icon aria-hidden {...props} />
}

export const SOCIAL_NETWORKS: Record<
  SocialNetwork,
  { label: string; Icon: ComponentType<IconProps>; placeholder: string }
> = {
  INSTAGRAM: {
    label: 'Instagram',
    Icon: InstagramLogoIcon,
    placeholder: 'https://instagram.com/…',
  },
  EMAIL: {
    label: 'E-mail',
    Icon: EnvelopeSimpleIcon,
    placeholder: 'coordenacao@ufc.br',
  },
  WHATSAPP: {
    label: 'WhatsApp',
    Icon: WhatsappLogoIcon,
    placeholder: 'https://wa.me/…',
  },
  YOUTUBE: {
    label: 'YouTube',
    Icon: YoutubeLogoIcon,
    placeholder: 'https://youtube.com/…',
  },
  SITE: { label: 'Site', Icon: GlobeIcon, placeholder: 'https://…' },
  OUTRO: { label: 'Outro', Icon: LinkSimpleIcon, placeholder: 'https://…' },
}
