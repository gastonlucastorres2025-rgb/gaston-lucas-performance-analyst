import { fetchGoleadoresClubAUF } from "@/lib/auf-scraper";
import { PageHeader } from "@/components/page-header";
import { TareasResumen } from "@/components/tareas-resumen";
import { UruguayStandings } from "@/components/uruguay-standings";
import {
  fetchCrucesSudamericana,
  fetchIntermedioGrupos,
  fetchProximosRivalesEnLiga,
  fetchStandingsPorTorneo,
} from "@/lib/espn-uruguay";
import { computeTablaAnual } from "@/lib/tabla-anual";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TEAM_NACIONAL_ESPN = "2684";

async function fetchRival(nombre: string | undefined) {
  if (!nombre) return null;

  // La AUF es la única fuente gratuita de goleadores que nos queda (sin API-Football):
  // solo cubre clubes uruguayos y no publica asistencias.
  let goleadores: { nombre: string; foto: string; goles: number; asistencias: number }[] = [];
  try {
    const aufGoleadores = await fetchGoleadoresClubAUF(nombre);
    goleadores = aufGoleadores.map((g) => ({ nombre: g.nombre, foto: g.escudo, goles: g.goles, asistencias: 0 }));
  } catch {
    // Rival no cubierto por la AUF (p. ej. clubes internacionales): queda "Sin datos.".
  }

  return { nombre, goleadores, asistidores: [] as { nombre: string; foto: string; goles: number; asistencias: number }[] };
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [aperturaRes, clausuraRes, intermedioRes, crucesRes, proximosRivalesRes, tareasRes] = await Promise.allSettled([
    fetchStandingsPorTorneo("Torneo Apertura"),
    fetchStandingsPorTorneo("Torneo Clausura"),
    fetchIntermedioGrupos(),
    fetchCrucesSudamericana(),
    fetchProximosRivalesEnLiga(TEAM_NACIONAL_ESPN),
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
  const proximosRivales =
    proximosRivalesRes.status === "fulfilled" ? proximosRivalesRes.value : { apertura: null, intermedio: null, clausura: null };
  const tareas = tareasRes.status === "fulfilled" ? (tareasRes.value.data ?? []) : [];

  const serieA = intermedio.find((g) => g.nombre === "Serie A")?.equipos ?? [];
  const serieB = intermedio.find((g) => g.nombre === "Serie B")?.equipos ?? [];
  const anual = computeTablaAnual(apertura, [...serieA, ...serieB], clausura);

  const { apertura: proximoApertura, intermedio: proximoIntermedio, clausura: proximoClausura } = proximosRivales;

  const cruceNacional = cruces.find(
    (c) => c.local.nombre.toLowerCase().includes("nacional") || c.visitante.nombre.toLowerCase().includes("nacional"),
  );
  const rivalSudamericana = cruceNacional
    ? cruceNacional.local.nombre.toLowerCase().includes("nacional")
      ? cruceNacional.visitante
      : cruceNacional.local
    : null;

  const [rivalAperturaRes, rivalIntermedioRes, rivalClausuraRes, rivalSudamericanaJugadoresRes] = await Promise.allSettled([
    fetchRival(proximoApertura?.nombre),
    fetchRival(proximoIntermedio?.nombre),
    fetchRival(proximoClausura?.nombre),
    fetchRival(rivalSudamericana?.nombre),
  ]);
  const rivalApertura = rivalAperturaRes.status === "fulfilled" ? rivalAperturaRes.value : null;
  const rivalIntermedio = rivalIntermedioRes.status === "fulfilled" ? rivalIntermedioRes.value : null;
  const rivalClausura = rivalClausuraRes.status === "fulfilled" ? rivalClausuraRes.value : null;
  const rivalSudamericanaJugadores =
    rivalSudamericanaJugadoresRes.status === "fulfilled" ? rivalSudamericanaJugadoresRes.value : null;

  const errores = [aperturaRes, clausuraRes, intermedioRes, crucesRes, proximosRivalesRes].some(
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
          apertura={apertura.map((e, i) => ({ rank: i + 1, nombre: e.nombre, escudo: e.escudo, jugados: e.jugados, puntos: e.puntos, diferencia: e.diferencia }))}
          intermedioSerieA={serieA.map((e, i) => ({ rank: i + 1, nombre: e.nombre, escudo: e.escudo, jugados: e.jugados, puntos: e.puntos, diferencia: e.diferencia }))}
          intermedioSerieB={serieB.map((e, i) => ({ rank: i + 1, nombre: e.nombre, escudo: e.escudo, jugados: e.jugados, puntos: e.puntos, diferencia: e.diferencia }))}
          clausura={clausura.map((e, i) => ({ rank: i + 1, nombre: e.nombre, escudo: e.escudo, jugados: e.jugados, puntos: e.puntos, diferencia: e.diferencia }))}
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
