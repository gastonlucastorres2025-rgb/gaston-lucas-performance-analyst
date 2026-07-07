"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jugadores", label: "Jugadores" },
  { href: "/entrenamientos", label: "Entrenamientos" },
  { href: "/partidos", label: "Partidos" },
  { href: "/scouting", label: "Scouting" },
  { href: "/medico", label: "Médico" },
  { href: "/videos", label: "Videos" },
  { href: "/informes", label: "Informes" },
  { href: "/configuracion/equipo", label: "Configuración" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 bg-primary p-4">
        <div className="px-3 pb-6 pt-2 text-lg font-semibold text-white">
          Nacional <span className="text-accent">·</span> Cuerpo Técnico
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md border-l-2 px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "border-accent bg-white/10 font-medium text-white"
                    : "border-transparent text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 bg-background p-8">{children}</main>
    </div>
  );
}
