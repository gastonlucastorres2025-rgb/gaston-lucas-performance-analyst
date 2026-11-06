"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/gps", label: "Resumen", exact: true },
  { href: "/gps/semana", label: "Semana actual" },
  { href: "/gps/acwr", label: "ACWR y riesgo" },
  { href: "/gps/lesiones", label: "Lesiones / molestias" },
  { href: "/gps/plantel", label: "Plantel" },
];

export function GpsSubnav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto">
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
