"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/gps", label: "Dashboard", exact: true },
  { href: "/gps/jugadores", label: "Jugadores" },
  { href: "/gps/sesiones", label: "Sesiones" },
  { href: "/gps/partidos", label: "Partidos" },
  { href: "/gps/comparar", label: "Comparativas" },
];

export function GpsSubnav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
      {ITEMS.map((item) => {
        const activo = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              activo ? "border-primary text-primary" : "border-transparent text-foreground/50 hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
