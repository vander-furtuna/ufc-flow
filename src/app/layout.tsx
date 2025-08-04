import './globals.css'

import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

import { FloatingBar } from './[courseSlug]/[curriculumSlug]/components/floating-bar'
import { AppProvider } from './app-provider'

const poppins = localFont({
  src: [
    {
      path: '../assets/fonts/poppins/Poppins-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../assets/fonts/poppins/Poppins-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../assets/fonts/poppins/Poppins-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../assets/fonts/poppins/Poppins-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-poppins',
  display: 'swap',
})

const clashDisplay = localFont({
  src: '../assets/fonts/clash-display/ClashDisplay-Variable.woff2',
  variable: '--font-clash-display',
})

export const viewport: Viewport = {
  initialScale: 1,
  minimumScale: 1,
  height: 'device-height',
  width: 'device-width',
}

export const metadata: Metadata = {
  title: {
    template: 'UFC Flow | %s',
    default: 'UFC Flow',
  },
  description:
    'Explore as disciplinas de seu curso na Universidade Federal do Ceará com UFC Flow',
  keywords: [
    'ufc flow',
    'ufc',
    'universidade federal do ceará',
    'cursos',
    'disciplinas',
    'grade curricular',
    'grade',
    'currículo',
    'curricular',
    'faculdade',
    'universidade',
    'curso',
    'disciplinas obrigatórias',
    'diagrama',
    'engenharia',
    'computação',
  ],
  authors: [
    {
      name: 'Vanderlei Furtuna',
      url: 'https://github.com/vander-furtuna',
    },
  ],
  openGraph: {
    title: 'UFC Flow | Explore as disciplinas de seu curso',
    description:
      'Explore as disciplinas de seu curso na Universidade Federal do Ceará com UFC Flow',
    images: [
      { url: 'https://flow.ufc.br/banner.png', width: 1440, height: 1024 },
    ],
    siteName: 'UFC Flow',
    url: 'https://flow.ufc.br',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UFC Flow | Explore as disciplinas de seu curso',
    description:
      'Explore as disciplinas de seu curso na Universidade Federal do Ceará com UFC Flow',
    images: ['https://flow.ufc.br/banner.png'],
  },
  robots: 'index, follow',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <Analytics />

      <head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon.png"
          type="image/png"
          sizes="180x180"
        />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>

      <body
        className={`${clashDisplay.variable} ${poppins.variable} bg-background max-h-full min-h-screen font-sans antialiased`}
        suppressHydrationWarning
      >
        <AppProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <main className="flex min-h-screen w-full flex-col items-center justify-start">
              {children}
              <FloatingBar />
            </main>
            <Toaster />
          </ThemeProvider>
        </AppProvider>
      </body>
    </html>
  )
}
