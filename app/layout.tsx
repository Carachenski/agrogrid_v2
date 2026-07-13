import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ConsultaProvider } from '@/components/consulta-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Agrogrid',
  description: 'Terminal de consultas SQL',
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
        <Analytics />
      </body>
    </html>
  )
}
