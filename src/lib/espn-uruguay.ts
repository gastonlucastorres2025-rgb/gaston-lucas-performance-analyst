// seasontype=2 = Torneo Intermedio (verificado contra la respuesta real de ESPN: sin este
// parámetro, el endpoint devuelve lo que ESPN considera la fase "actual" según la fecha, y
// llama a sus grupos simplemente "Group A"/"Group B" (antes incluían "Intermedio" en el
// nombre — dejó de ser así, lo que rompía el filtro por texto que había acá). Con
// seasontype=2 fijo, los únicos children que devuelve son los grupos de Intermedio.
const ESPN_URL = (year: number) =>
  `https://site.api.espn.com/apis/v2/sports/soccer/uru.1/standings?season=${year}&seasontype=2`;
const REVALIDATE_SECONDS = 1800;

export type EspnStandingRow = {
  teamId: string;
  nombre: string;
  escudo: string;
  jugados: number;
  puntos: number;
  diferencia: number;
};

export type EspnGrupo = { nombre: string; equipos: EspnStandingRow[] };

type EspnStandingsResponse = {
  children: {
    name: string;
    standings: {
      entries: {
        team: { id: string; displayName: string; logos?: { href: string }[] };
        stats: { name: string; value: number }[];
      }[];
    };
  }[];
};

function stat(stats: { name: string; value: number }[], name: string): number {
  return stats.find((s) => s.name === name)?.value ?? 0;
}

export async function fetchIntermedioGrupos(): Promise<EspnGrupo[]> {
  const year = new Date().getFullYear();
  const res = await fetch(ESPN_URL(year), { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) return [];
  const data = (await res.json()) as EspnStandingsResponse;

  return (data.children ?? []).map((child) => ({
    nombre: child.name.includes("Group A") ? "Serie A" : child.name.includes("Group B") ? "Serie B" : child.name,
    equipos: child.standings.entries
      .map((e) => ({
        teamId: e.team.id,
        nombre: e.team.displayName,
        escudo: e.team.logos?.[0]?.href ?? "",
        jugados: stat(e.stats, "gamesPlayed"),
        puntos: stat(e.stats, "points"),
        diferencia: stat(e.stats, "pointDifferential"),
      }))
      .sort((a, b) => b.puntos - a.puntos),
  }));
}

type EspnTipoTorneo = { name: string; startDate: string; endDate: string };
type EspnMetaResponse = { seasons?: { types?: EspnTipoTorneo[] }[] };

async function fetchTiposTorneo(year: number): Promise<EspnTipoTorneo[]> {
  // Cualquier seasontype devuelve la lista completa de fases del año (con sus fechas
  // reales), así que reutilizamos el mismo pedido que ya hacemos para Intermedio.
  const res = await fetch(ESPN_URL(year), { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) return [];
  const data = (await res.json()) as EspnMetaResponse;
  return data.seasons?.[0]?.types ?? [];
}

function slugDeTorneo(nombre: string): string {
  return nombre.toLowerCase().replace(/\s+/g, "-");
}

type EspnEventoConSlug = {
  id: string;
  date: string;
  season?: { slug: string };
  competitions: { status: { type: { completed: boolean } }; competitors: EspnCompetidor[] }[];
};

// ESPN resetea a 0 las estadísticas agregadas de una fase del año en curso apenas empieza
// la fase siguiente (verificado contra la API real: seasontype=1 sigue devolviendo los 16
// equipos de Apertura, pero con "points"/"gamesPlayed" en 0 una vez que Intermedio arrancó).
// Por eso reconstruimos la tabla nosotros mismos a partir de los resultados de cada partido,
// usando season.slug para no mezclar fases cuyas fechas se superponen (Intermedio arranca
// antes de que termine Apertura).
export async function fetchStandingsPorTorneo(nombreTorneo: "Torneo Apertura" | "Torneo Clausura"): Promise<EspnStandingRow[]> {
  const year = new Date().getFullYear();
  const tipos = await fetchTiposTorneo(year);
  const tipo = tipos.find((t) => t.name === nombreTorneo);
  if (!tipo) return [];

  const fmt = (iso: string) => iso.slice(0, 10).replace(/-/g, "");
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/uru.1/scoreboard?dates=${fmt(tipo.startDate)}-${fmt(tipo.endDate)}&limit=300`,
    { next: { revalidate: REVALIDATE_SECONDS } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { events?: EspnEventoConSlug[] };
  const slug = slugDeTorneo(nombreTorneo);
  const partidos = (data.events ?? []).filter((e) => e.season?.slug === slug && e.competitions[0].status.type.completed);

  type Acumulado = { teamId: string; nombre: string; escudo: string; jugados: number; puntos: number; golesFor: number; golesAgainst: number };
  const tabla = new Map<string, Acumulado>();

  const entradaDe = (c: EspnCompetidor) => {
    if (!tabla.has(c.team.id)) {
      tabla.set(c.team.id, {
        teamId: c.team.id,
        nombre: c.team.displayName,
        escudo: c.team.logo,
        jugados: 0,
        puntos: 0,
        golesFor: 0,
        golesAgainst: 0,
      });
    }
    return tabla.get(c.team.id)!;
  };

  for (const p of partidos) {
    const home = p.competitions[0].competitors.find((c) => c.homeAway === "home")!;
    const away = p.competitions[0].competitors.find((c) => c.homeAway === "away")!;
    const golesHome = Number(home.score);
    const golesAway = Number(away.score);

    const eh = entradaDe(home);
    const ea = entradaDe(away);
    eh.jugados += 1;
    ea.jugados += 1;
    eh.golesFor += golesHome;
    eh.golesAgainst += golesAway;
    ea.golesFor += golesAway;
    ea.golesAgainst += golesHome;

    if (golesHome > golesAway) eh.puntos += 3;
    else if (golesHome < golesAway) ea.puntos += 3;
    else {
      eh.puntos += 1;
      ea.puntos += 1;
    }
  }

  return [...tabla.values()]
    .map((t) => ({
      teamId: t.teamId,
      nombre: t.nombre,
      escudo: t.escudo,
      jugados: t.jugados,
      puntos: t.puntos,
      diferencia: t.golesFor - t.golesAgainst,
    }))
    .sort((a, b) => b.puntos - a.puntos);
}

export type EspnProximoRival = {
  teamId: string;
  nombre: string;
  escudo: string;
  ronda: string;
  fecha: string;
};

type EspnCompetidor = {
  homeAway: "home" | "away";
  score: string;
  team: { id: string; displayName: string; logo: string };
};

type EspnEvento = {
  id: string;
  date: string;
  seasonType?: { name: string };
  competitions: {
    date: string;
    status: { type: { state: string; completed: boolean } };
    competitors: EspnCompetidor[];
  }[];
};

type EspnScheduleResponse = { events?: EspnEvento[] };

// La Liga AUF Uruguaya devuelve el calendario completo del club (los tres torneos) en un
// solo pedido, con seasonType.name marcando a cuál pertenece cada partido — evitamos así 3
// llamadas separadas y cualquier heurística de texto sobre el nombre de la ronda.
export async function fetchProximosRivalesEnLiga(
  teamId: string,
): Promise<{ apertura: EspnProximoRival | null; intermedio: EspnProximoRival | null; clausura: EspnProximoRival | null }> {
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/uru.1/teams/${teamId}/schedule`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) return { apertura: null, intermedio: null, clausura: null };
  const data = (await res.json()) as EspnScheduleResponse;

  const proximoDe = (torneo: string): EspnProximoRival | null => {
    const evento = data.events?.find(
      (e) => e.seasonType?.name === torneo && e.competitions[0].status.type.state === "pre",
    );
    if (!evento) return null;
    const comp = evento.competitions[0];
    const rival = comp.competitors.find((c) => c.team.id !== teamId);
    if (!rival) return null;
    return { teamId: rival.team.id, nombre: rival.team.displayName, escudo: rival.team.logo, ronda: torneo, fecha: comp.date };
  };

  return {
    apertura: proximoDe("Torneo Apertura"),
    intermedio: proximoDe("Torneo Intermedio"),
    clausura: proximoDe("Torneo Clausura"),
  };
}

export type EspnCruce = {
  local: { teamId: string; nombre: string; escudo: string };
  visitante: { teamId: string; nombre: string; escudo: string };
  ida: { fecha: string; golesLocal: number | null; golesVisitante: number | null } | null;
  vuelta: { fecha: string; golesLocal: number | null; golesVisitante: number | null } | null;
};

function rangoFechas(dias: number): string {
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const hoy = new Date();
  const desde = new Date(hoy);
  desde.setDate(desde.getDate() - dias);
  const hasta = new Date(hoy);
  hasta.setDate(hasta.getDate() + dias);
  return `${fmt(desde)}-${fmt(hasta)}`;
}

// Ventana de ±10 días alrededor de hoy: suficiente para capturar ambas fechas (ida y vuelta)
// de la llave en curso sin necesidad de conocer de antemano las fechas exactas del torneo.
export async function fetchCrucesSudamericana(): Promise<EspnCruce[]> {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.sudamericana/scoreboard?dates=${rangoFechas(10)}`,
    { next: { revalidate: REVALIDATE_SECONDS } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as EspnScheduleResponse;
  const eventos = data.events ?? [];

  const home = (e: EspnEvento) => e.competitions[0].competitors.find((c) => c.homeAway === "home")!;
  const away = (e: EspnEvento) => e.competitions[0].competitors.find((c) => c.homeAway === "away")!;
  const goles = (c: EspnCompetidor, completado: boolean) => (completado ? Number(c.score) : null);

  const vistos = new Set<string>();
  const cruces: EspnCruce[] = [];

  for (const ev of eventos) {
    if (vistos.has(ev.id)) continue;
    const vuelta = eventos.find(
      (o) => o.id !== ev.id && home(o).team.id === away(ev).team.id && away(o).team.id === home(ev).team.id,
    );

    vistos.add(ev.id);
    if (vuelta) vistos.add(vuelta.id);

    const primero = vuelta && new Date(vuelta.date) < new Date(ev.date) ? vuelta : ev;
    const segundo = primero === ev ? vuelta : ev;

    cruces.push({
      local: { teamId: home(primero).team.id, nombre: home(primero).team.displayName, escudo: home(primero).team.logo },
      visitante: {
        teamId: away(primero).team.id,
        nombre: away(primero).team.displayName,
        escudo: away(primero).team.logo,
      },
      ida: {
        fecha: primero.competitions[0].date,
        golesLocal: goles(home(primero), primero.competitions[0].status.type.completed),
        golesVisitante: goles(away(primero), primero.competitions[0].status.type.completed),
      },
      vuelta: segundo
        ? {
            fecha: segundo.competitions[0].date,
            golesLocal: goles(home(segundo), segundo.competitions[0].status.type.completed),
            golesVisitante: goles(away(segundo), segundo.competitions[0].status.type.completed),
          }
        : null,
    });
  }

  return cruces.sort((a, b) => new Date(a.ida!.fecha).getTime() - new Date(b.ida!.fecha).getTime());
}
