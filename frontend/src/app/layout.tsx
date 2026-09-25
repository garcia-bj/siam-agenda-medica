import type { Metadata } from 'next';
import { Fraunces, Instrument_Sans } from 'next/font/google';
import Providers from './providers';
import './globals.css';

const fraunces = Fraunces({
  variable: '--font-heading',
  subsets: ['latin'],
  display: 'swap',
});

const instrumentSans = Instrument_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SIAM – Sistema de Agenda Médica',
  description:
    'Reserva, reprograma y consulta citas médicas en la clínica SIAM.',
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${fraunces.variable} ${instrumentSans.variable}`}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
