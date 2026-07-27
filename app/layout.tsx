import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ConsultaProvider } from '@/components/consulta-provider'
import { ScrollReveal } from '@/components/scroll-reveal'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Agrogrid — Inteligência Fundiária e Patrimonial',
  description: 'Consolidação fundiária, produção e score de crédito do produtor rural.',
  generator: '',
  icons: {
    icon: [],
    apple: [],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ConsultaProvider>
          {children}
        </ConsultaProvider>
        <ScrollReveal />
        <Analytics />
      </body>
    </html>
  )
}
