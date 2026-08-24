"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TareasNotifier } from "@/components/tareas-notifier";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jugadores", label: "Jugadores" },
  { href: "/entrenamientos", label: "Entrenamientos" },
  { href: "/planificacion", label: "Planificación" },
  { href: "/partidos", label: "Partidos" },
  { href: "/gps", label: "GPS" },
  { href: "/metricas", label: "Métricas de Rendimiento" },
  { href: "/rivales", label: "Rivales" },
  { href: "/videoanalisis", label: "Videoanálisis" },
  { href: "/analisis-rival", label: "Análisis de Rival" },
  { href: "/fases-rival", label: "Fases del Rival" },
  { href: "/statsbomb", label: "Informe StatsBomb" },
  { href: "/informes-post-partido", label: "Informe Post Partido" },
  { href: "/scouting", label: "Scouting" },
  { href: "/seguimiento-internacional", label: "Seguimiento Internacional" },
  { href: "/tareas", label: "Tareas" },
  { href: "/configuracion/equipo", label: "Configuración" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [perfil, setPerfil] = useState<{ nombre: string; soloLectura: boolean } | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("staff_users").select("nombre, solo_lectura").eq("id", user.id).single();
      if (activo && data) setPerfil({ nombre: data.nombre, soloLectura: data.solo_lectura });
    })();
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo se necesita una vez al montar
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col bg-primary">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <Image
            src="/escudo-nacional.png"
            alt="Escudo de Nacional"
            width={40}
            height={40}
            priority
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">
              Cuerpo Técnico
            </div>
            <div className="text-xs text-white/60">{perfil?.nombre ?? " "}</div>
          </div>
        </div>
        {perfil?.soloLectura && (
          <div className="mx-3 mt-3 rounded-md bg-accent/20 px-3 py-2 text-xs font-medium text-white">
            👁 Modo solo lectura — podés navegar y descargar, pero no guardar cambios.
          </div>
        )}
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
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
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-end border-b border-border bg-surface px-8">
          <button
            onClick={handleLogout}
            className="text-sm text-foreground/60 transition-colors hover:text-accent"
          >
            Cerrar sesión
          </button>
        </header>
        <main className="flex-1 bg-background px-8 py-8">{children}</main>
      </div>
      <TareasNotifier />
    </div>
  );
}
