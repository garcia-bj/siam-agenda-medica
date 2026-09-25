import type { Metadata } from 'next';
import { Fraunces, Instrument_Sans } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { Toaster } from 'sonner';
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

function Header() {
  return (
    <header className="site-header">
      <div className="header-container">
        <Link href="/" className="brand">
          <Image src="/icon.svg" alt="" width={32} height={32} />
          <span>SIAM / <strong>Agenda Médica</strong></span>
        </Link>
        <nav className="nav-pills">
          <Link href="/agendar" className="nav-pill" aria-current="page">Agendar cita</Link>
          <Link href="/citas" className="nav-pill">Citas</Link>
          <Link href="/" className="nav-pill">Dashboard</Link>
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${instrumentSans.variable}`}>
      <body>
        <Providers>
          <Header />
          {children}
          <Toaster richColors position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
