'use client'

import { createContext, useContext, type ReactNode } from 'react'

type Features = {
  // Com API_URL configurada. Sem ela (produção até a fase 13, previews), o
  // hub e as demais telas que só existem na API ficam escondidos (D51).
  api: boolean
}

const FeaturesContext = createContext<Features>({ api: false })

export function FeaturesProvider({
  value,
  children,
}: {
  value: Features
  children: ReactNode
}) {
  return <FeaturesContext value={value}>{children}</FeaturesContext>
}

export const useFeatures = () => useContext(FeaturesContext)
