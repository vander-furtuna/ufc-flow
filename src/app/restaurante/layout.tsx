import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Restaurante Universitário | Cardápio UFC',
  description:
    'Consulte o cardápio diário e atualizado do Restaurante Universitário (RU) da UFC para os campi de Sobral, Fortaleza, Quixadá, Russas, Crateús e Itapajé.',
  keywords: [
    'RU UFC',
    'Cardápio RU UFC',
    'Restaurante Universitário UFC',
    'RU Sobral',
    'RU Fortaleza',
    'RU Quixadá',
    'RU Russas',
    'RU Crateús',
    'UFC Flow',
  ],
  openGraph: {
    title: 'Restaurante Universitário | Cardápio UFC',
    description:
      'Cardápio diário do Restaurante Universitário (RU) da Universidade Federal do Ceará.',
    type: 'website',
  },
}

export default function RuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
