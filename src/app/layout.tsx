import './globals.css';

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1B4332',
};

export const metadata: Metadata = {
  title: {
    default: 'Reporte Ciudadano Coatepec',
    template: '%s | Reporte Ciudadano Coatepec',
  },
  description:
    'Plataforma oficial para el levantamiento de reportes ciudadanos en Coatepec, Veracruz. Reporta baches, alumbrado público, fugas de agua, basura y más.',
  keywords: [
    'Coatepec',
    'Veracruz',
    'reportes ciudadanos',
    'baches',
    'alumbrado público',
    'fugas de agua',
    'basura',
    'protección civil',
    'gobierno municipal',
  ],
  authors: [{ name: 'Municipio de Coatepec' }],
  creator: 'Municipio de Coatepec',
  publisher: 'Municipio de Coatepec',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://reporte-ciudadano-coatepec.vercel.app'),
  openGraph: {
    title: 'Reporte Ciudadano Coatepec',
    description:
      'Plataforma oficial para el levantamiento de reportes ciudadanos en Coatepec, Veracruz.',
    url: 'https://reporte-ciudadano-coatepec.vercel.app',
    siteName: 'Reporte Ciudadano Coatepec',
    locale: 'es_MX',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reporte Ciudadano Coatepec',
    description:
      'Plataforma oficial para el levantamiento de reportes ciudadanos en Coatepec, Veracruz.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add Google Search Console verification code here when available
    // google: 'your-verification-code',
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Reporte Coatepec',
  },
  applicationName: 'Reporte Ciudadano Coatepec',
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={cn('min-h-screen bg-secondary font-sans antialiased', inter.className)}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
