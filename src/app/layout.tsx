import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/provider/providers';
import 'dotenv/config.js';
import Header from '@/components/header/Header';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Hold Now',
  description: 'You can have chance to ...',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        <Providers>
          <Header></Header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
