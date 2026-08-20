import { createAdminClient } from "@/lib/supabase/admin";

type JugadorFila = {
  id: string;
  full_name: string;
  normalized_name: string;
  current_club: string | null;
  photo_url: string | null;
  primary_position: string | null;
  secondary_positions: string[] | null;
  height: number | null;
  preferred_foot: string | null;
  nationality: string | null;
  birth_date: string | null;
  transfermarkt_url: string | null;
  club_escudo_url: string | null;
  tracking_status: string;
  profile_state: string;
};

// Ruido de nombre de archivo que a veces quedó pegado como si fuera club (ej.
// ".numbers RECOLETA") — se trata como "sin club real", no como un club distinto.
function esClubBasura(club: string | null): boolean {
  if (!club) return true;
  return /\.numbers|resumen|individual(es)?|informe/i.test(club);
}

function puntaje(j: JugadorFila): number {
  let p = 0;
  if (j.photo_url) p += 3;
  if (j.current_club && !esClubBasura(j.current_club)) p += 2;
  if (j.transfermarkt_url) p += 2;
  if (j.primary_position) p += 1;
  if (j.height) p += 1;
  if (j.preferred_foot) p += 1;
  if (j.birth_date) p += 1;
  return p;
}

// Uso único: fusiona automáticamente los perfiles que comparten exactamente el mismo
// nombre normalizado (sin acentos/mayúsculas) Y no tienen clubes reales distintos entre
// sí (uno de los dos puede no tener club, o el "club" puede ser ruido de nombre de
// archivo). Los casos con dos clubes reales distintos quedan afuera a propósito: ahí
// puede ser la misma persona transferida o dos personas distintas con nombre común, y
// eso requiere un criterio que este proceso no tiene forma de aplicar solo.
export async function GET() {
  const admin = createAdminClient();
  const { data: team } = await admin.from("teams").select("id").limit(1).single();
  if (!team) return Response.json({ error: "No hay equipo configurado" }, { status: 500 });

  const { data: jugadores } = await admin
    .from("si_jugadores")
    .select(
      "id, full_name, normalized_name, current_club, photo_url, primary_position, secondary_positions, height, preferred_foot, nationality, birth_date, transfermarkt_url, club_escudo_url, tracking_status, profile_state",
    );

  const grupos = new Map<string, JugadorFila[]>();
  for (const j of (jugadores ?? []) as JugadorFila[]) {
    if (!grupos.has(j.normalized_name)) grupos.set(j.normalized_name, []);
    grupos.get(j.normalized_name)!.push(j);
  }

  const resultados: { nombre: string; estado: string; detalle?: string }[] = [];

  for (const [nombre, filas] of grupos) {
    if (filas.length < 2) continue;

    const clubesReales = new Set(filas.map((f) => f.current_club).filter((c) => !esClubBasura(c)));
    if (clubesReales.size > 1) {
      resultados.push({ nombre, estado: "omitido_ambiguo", detalle: [...clubesReales].join(" / ") });
      continue;
    }

    // Puede haber más de 2 con el mismo nombre; se fusionan todos contra el de mayor puntaje.
    const ordenados = [...filas].sort((a, b) => puntaje(b) - puntaje(a));
    const destino = ordenados[0];
    const origenes = ordenados.slice(1);

    for (const origen of origenes) {
      try {
        // Completar en destino los campos que le falten con los del origen.
        const completar: Record<string, unknown> = {};
        const candidatos: [string, unknown][] = [
          ["current_club", esClubBasura(destino.current_club) && !esClubBasura(origen.current_club) ? origen.current_club : null],
          ["photo_url", origen.photo_url],
          ["primary_position", origen.primary_position],
          ["height", origen.height],
          ["preferred_foot", origen.preferred_foot],
          ["nationality", origen.nationality],
          ["birth_date", origen.birth_date],
          ["transfermarkt_url", origen.transfermarkt_url],
          ["club_escudo_url", origen.club_escudo_url],
        ];
        for (const [campo, valor] of candidatos) {
          if (valor != null && (destino as unknown as Record<string, unknown>)[campo] == null) {
            completar[campo] = valor;
          }
        }

        const { data: observacionesOrigen } = await admin.from("si_observaciones").select("*").eq("player_id", origen.id);
        const { data: cambiosOrigen } = await admin.from("si_cambios_historial").select("*").eq("player_id", origen.id);

        if (Object.keys(completar).length > 0) {
          await admin.from("si_jugadores").update(completar).eq("id", destino.id);
        }

        await admin.from("si_observaciones").update({ player_id: destino.id }).eq("player_id", origen.id);
        await admin.from("si_jugador_etiquetas").update({ player_id: destino.id }).eq("player_id", origen.id);
        await admin.from("si_cambios_historial").update({ player_id: destino.id }).eq("player_id", origen.id);

        await admin.from("si_fusiones").insert({
          team_id: team.id,
          origen_player_id: origen.id,
          destino_player_id: destino.id,
          motivo: "Mismo nombre normalizado, sin conflicto de club (fusión automática)",
          datos_revertir: { jugador: origen, observaciones: observacionesOrigen ?? [], cambios_historial: cambiosOrigen ?? [] },
        });

        await admin.from("si_jugadores").delete().eq("id", origen.id);

        resultados.push({ nombre, estado: "fusionado", detalle: `${origen.full_name} -> ${destino.full_name}` });
      } catch (e) {
        resultados.push({ nombre, estado: "error", detalle: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  return Response.json({ resultados, totalFusionados: resultados.filter((r) => r.estado === "fusionado").length });
}
