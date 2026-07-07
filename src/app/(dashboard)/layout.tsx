import Link from "next/link";

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
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-black/10 p-4">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-3 py-2 text-sm hover:bg-black/5"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
