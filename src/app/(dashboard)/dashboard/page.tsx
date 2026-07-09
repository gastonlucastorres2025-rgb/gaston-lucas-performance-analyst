import {
  fetchCrucesRonda,
  fetchProximoRivalEnLiga,
  fetchStandings,
  fetchTopJugadores,
  LEAGUE_APERTURA,
  LEAGUE_CLAUSURA,
  LEAGUE_SUDAMERICANA,
  TEAM_NACIONAL,
} from "@/lib/api-football";
import { PageHeader } from "@/components/page-header";
import { TareasResumen } from "@/components/tareas-resumen";
import { UruguayStandings } from "@/components/uruguay-standings";
import { fetchIntermedioGrupos } from "@/lib/espn-uruguay";
import { computeTablaAnual } from "@/lib/tabla-anual";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function fetchRival(teamId: number | undefined, nombre: string | undefined) {
  if (!teamId || !nombre) return null;
  const { goleadores, asistidores } = await fetchTopJugadores(teamId);
  return { nombre, goleadores, asistidores };
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [aperturaRes, clausuraRes, intermedioRes, crucesRes, proximoLigaRes, proximoClausuraRes, tareasRes] =
    await Promise.allSettled([
      fetchStandings(LEAGUE_APERTURA),
      fetchStandings(LEAGUE_CLAUSURA),
      fetchIntermedioGrupos(),
      fetchCrucesRonda(LEAGUE_SUDAMERICANA, "Round of 32"),
      fetchProximoRivalEnLiga(TEAM_NACIONAL, LEAGUE_APERTURA),
      fetchProximoRivalEnLiga(TEAM_NACIONAL, LEAGUE_CLAUSURA),
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
  const cruces = crucesRes.status === "fulfilled" ? crucesRes.value : [];
  const proximoLiga = proximoLigaRes.status === "fulfilled" ? proximoLigaRes.value : null;
  const proximoClausura = proximoClausuraRes.status === "fulfilled" ? proximoClausuraRes.value : null;
  const tareas = tareasRes.status === "fulfilled" ? (tareasRes.value.data ?? []) : [];

  const serieA = intermedio.find((g) => g.nombre === "Serie A")?.equipos ?? [];
  const serieB = intermedio.find((g) => g.nombre === "Serie B")?.equipos ?? [];
  const anual = computeTablaAnual(apertura, [...serieA, ...serieB], clausura);

  // El "próximo rival" de la liga 268 puede ser de Apertura o de Intermedio según la ronda vigente.
  const rondaProxima = proximoLiga?.ronda.toLowerCase() ?? "";
  const proximoApertura = rondaProxima.includes("apertura") ? proximoLiga : null;
  const proximoIntermedio = rondaProxima.includes("intermedio") ? proximoLiga : null;

  const cruceNacional = cruces.find(
    (c) => c.local.nombre.toLowerCase().includes("nacional") || c.visitante.nombre.toLowerCase().includes("nacional"),
  );
  const rivalSudamericana = cruceNacional
    ? cruceNacional.local.nombre.toLowerCase().includes("nacional")
      ? cruceNacional.visitante
      : cruceNacional.local
    : null;

  const [rivalApertura, rivalIntermedio, rivalClausura, rivalSudamericanaJugadores] = await Promise.all([
    fetchRival(proximoApertura?.teamId, proximoApertura?.nombre),
    fetchRival(proximoIntermedio?.teamId, proximoIntermedio?.nombre),
    fetchRival(proximoClausura?.teamId, proximoClausura?.nombre),
    fetchRival(rivalSudamericana?.teamId, rivalSudamericana?.nombre),
  ]);

  const errores = [aperturaRes, clausuraRes, intermedioRes, crucesRes, proximoLigaRes, proximoClausuraRes].some(
    (r) => r.status === "rejected",
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Posiciones del campeonato uruguayo, Copa Sudamericana, próximo rival por competencia y tareas pendientes."
      />

      {errores && (
        <p className="mb-4 rounded-md bg-accent/10 px-3 py-2 text-sm text-accent">
          Algunos datos en vivo no se pudieron cargar. Probá recargar la página.
        </p>
      )}

      <div className="mb-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground/50">Torneos</h2>
        <UruguayStandings
          apertura={apertura}
          intermedioSerieA={serieA.map((e, i) => ({ rank: i + 1, nombre: e.nombre, escudo: e.escudo, jugados: e.jugados, puntos: e.puntos, diferencia: e.diferencia }))}
          intermedioSerieB={serieB.map((e, i) => ({ rank: i + 1, nombre: e.nombre, escudo: e.escudo, jugados: e.jugados, puntos: e.puntos, diferencia: e.diferencia }))}
          clausura={clausura}
          anual={anual}
          cruces={cruces}
          rivalApertura={rivalApertura}
          rivalIntermedio={rivalIntermedio}
          rivalClausura={rivalClausura}
          rivalSudamericana={rivalSudamericanaJugadores}
        />
      </div>

      <TareasResumen tareas={tareas} />
    </div>
  );
}
