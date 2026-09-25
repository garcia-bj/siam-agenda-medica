'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/agendar', label: 'Agendar cita' },
  { href: '/citas', label: 'Citas' },
];

export default function NavPills() {
  const pathname = usePathname();

  return (
    <nav className="nav-pills" aria-label="Navegación principal">
      {NAV.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="nav-pill"
          aria-current={pathname === href ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
