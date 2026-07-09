import {
  fetchGroupStandings,
  fetchStandings,
  fetchTopJugadores,
  LEAGUE_APERTURA,
  LEAGUE_CLAUSURA,
  LEAGUE_SUDAMERICANA,
  TEAM_TIGRE,
} from "@/lib/api-football";
import { PageHeader } from "@/components/page-header";
import { RivalJugadores } from "@/components/rival-jugadores";
import { SudamericanaGrupos } from "@/components/sudamericana-grupos";
import { TareasResumen } from "@/components/tareas-resumen";
import { UruguayStandings } from "@/components/uruguay-standings";
import { fetchIntermedioGrupos } from "@/lib/espn-uruguay";
import { computeTablaAnual } from "@/lib/tabla-anual";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [aperturaRes, clausuraRes, intermedioRes, sudamericanaRes, tigreRes, tareasRes] = await Promise.allSettled([
    fetchStandings(LEAGUE_APERTURA),
    fetchStandings(LEAGUE_CLAUSURA),
    fetchIntermedioGrupos(),
    fetchGroupStandings(LEAGUE_SUDAMERICANA),
    fetchTopJugadores(TEAM_TIGRE),
    supabase
      .from("tareas")
      .select("id, titulo, fecha, hora")
      .eq("completada", false)
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true }),
  ]);

  const apertura = aperturaRes.status === "fulfilled" ? aperturaRes.value : [];
  const clausura = clausuraRes.status === "fulfilled" ? clausuraRes.value : [];
  const intermedio = intermedioRes.status === "fulfilled" ? intermedioRes.value : [];
  const sudamericana = sudamericanaRes.status === "fulfilled" ? sudamericanaRes.value : [];
  const tigre =
    tigreRes.status === "fulfilled" ? tigreRes.value : { goleadores: [], asistidores: [] };
  const tareas = tareasRes.status === "fulfilled" ? (tareasRes.value.data ?? []) : [];

  const serieA = intermedio.find((g) => g.nombre === "Serie A")?.equipos ?? [];
  const serieB = intermedio.find((g) => g.nombre === "Serie B")?.equipos ?? [];
  const anual = computeTablaAnual(apertura, [...serieA, ...serieB], clausura);

  const errores = [aperturaRes, clausuraRes, intermedioRes, sudamericanaRes, tigreRes].some(
    (r) => r.status === "rejected",
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Posiciones del campeonato uruguayo, Copa Sudamericana, próximo rival y tareas pendientes."
      />

      {errores && (
        <p className="mb-4 rounded-md bg-accent/10 px-3 py-2 text-sm text-accent">
          Algunos datos en vivo no se pudieron cargar. Probá recargar la página.
        </p>
      )}

      <div className="mb-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Campeonato Uruguayo
        </h2>
        <UruguayStandings
          apertura={apertura}
          intermedioSerieA={serieA.map((e, i) => ({ rank: i + 1, nombre: e.nombre, escudo: e.escudo, jugados: e.jugados, puntos: e.puntos, diferencia: e.diferencia }))}
          intermedioSerieB={serieB.map((e, i) => ({ rank: i + 1, nombre: e.nombre, escudo: e.escudo, jugados: e.jugados, puntos: e.puntos, diferencia: e.diferencia }))}
          clausura={clausura}
          anual={anual}
        />
      </div>

      <div className="mb-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Copa Sudamericana · Fase de grupos
        </h2>
        <SudamericanaGrupos grupos={sudamericana.map((g) => ({ grupo: g.grupo, filas: g.equipos }))} />
      </div>

      <div className="mb-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Próximo rival: Tigre
        </h2>
        <RivalJugadores rival="Tigre" goleadores={tigre.goleadores} asistidores={tigre.asistidores} />
      </div>

      <TareasResumen tareas={tareas} />
    </div>
  );
}
