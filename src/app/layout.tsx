import './globals.css'

import type { Metadata, Viewport } from 'next'
import { Poppins } from 'next/font/google'
import localFont from 'next/font/local'

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

import { FloatingBar } from './[courseSlug]/[curriculumSlug]/components/floating-bar'
import { CourseProvider } from './contexts/course'
import { FilterProvider } from './contexts/filter'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
})

// const spaceGrotesk = Space_Grotesk({
//   subsets: ['latin'],
//   weight: ['400', '500', '600', '700'],
//   variable: '--font-space-grotesk',
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
    'UFC',
    'Universidade Federal do Ceará',
    'UFC Flow',
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
    images: [`${process.env.NEXT_PUBLIC_SITE_URL}/banner.png`],
    url: `${process.env.NEXT_PUBLIC_SITE_URL}`,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <FilterProvider>
        <CourseProvider>
          <body
            className={`${poppins.variable} ${clashDisplay.variable} bg-background max-h-full min-h-screen font-sans antialiased`}
            suppressHydrationWarning
          >
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
          </body>
        </CourseProvider>
      </FilterProvider>
    </html>
  )
}
