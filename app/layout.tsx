import type { Metadata } from 'next';
import { Inter, DM_Sans } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EVOCRM — Sistema Operacional Comercial & Operacional da EvoPixel',
  description: 'Plataforma proprietária de gestão comercial, prospecção por nicho, automação n8n e inteligência de vendas da EvoPixel.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`dark ${inter.variable} ${dmSans.variable}`}>
      <body className="bg-[var(--evo-bg)] text-[var(--evo-text)] antialiased selection:bg-[#F1F9A1]/20 selection:text-[#F1F9A1] font-sans transition-colors duration-200">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

