import type { Metadata } from 'next';
import { Inter, Manrope, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { BosProvider } from '@/lib/services/bos-context';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Agro-Deliveries Kenya BOS',
  description:
    'Unified Business Operating System for Agro-Deliveries Kenya covering institutional supply, FEFO inventory, procurement, warehouse fulfillment, deliveries, finance, CRM, and RBAC governance.',
  openGraph: {
    title: 'Agro-Deliveries Kenya BOS',
    description:
      'Unified Business Operating System for Agro-Deliveries Kenya covering institutional supply, FEFO inventory, procurement, warehouse fulfillment, deliveries, finance, CRM, and RBAC governance.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${manrope.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen antialiased selection:bg-[#4EB462]/20 selection:text-[#1F6A37]">
        <BosProvider>{children}</BosProvider>
      </body>
    </html>
  );
}
