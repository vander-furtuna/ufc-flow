import './globals.css'

import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

import { FloatingBar } from './[courseSlug]/[curriculumSlug]/components/floating-bar'
import { AppProvider } from './app-provider'

// const poppins = Poppins({
//   subsets: ['latin'],
//   weight: ['400', '500', '600', '700'],
//   display: 'swap',
//   variable: '--font-poppins',
//   adjustFontFallback: false,
// })

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
    'UFC Flow',
    'UFC',
    'Universidade Federal do Ceará',
    'Curso',
    'Disciplina',
    'Grade Curricular',
    'Curriculum',
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
    images: ['https://flow.ufc.br/banner.png'],
    url: 'https://flow.ufc.br',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <Analytics />

      <body
        className={`${clashDisplay.variable} bg-background max-h-full min-h-screen font-sans antialiased`}
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
