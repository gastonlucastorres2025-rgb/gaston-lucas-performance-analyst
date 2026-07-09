import type { StandingRow } from "@/lib/api-football";
import type { EspnStandingRow } from "@/lib/espn-uruguay";

// Mapeo de equipos entre API-Football (Apertura/Clausura) y ESPN (Intermedio):
// ambas fuentes nombran a los mismos 16 clubes de forma distinta.
const EQUIPOS = [
  { slug: "deportivo-maldonado", nombre: "Deportivo Maldonado", afId: 2370, espnId: "10000" },
  { slug: "racing", nombre: "Racing", afId: 2359, espnId: "9903" },
  { slug: "penarol", nombre: "Peñarol", afId: 2348, espnId: "2683" },
  { slug: "albion", nombre: "Albion", afId: 2378, espnId: "21403" },
  { slug: "nacional", nombre: "Nacional", afId: 2356, espnId: "2684" },
  { slug: "central-espanol", nombre: "Central Español", afId: 2368, espnId: "131688" },
  { slug: "torque", nombre: "Torque", afId: 2365, espnId: "19002" },
  { slug: "wanderers", nombre: "Wanderers", afId: 2360, espnId: "5501" },
  { slug: "liverpool", nombre: "Liverpool", afId: 2358, espnId: "5492" },
  { slug: "cerro-largo", nombre: "Cerro Largo", afId: 2369, espnId: "9902" },
  { slug: "defensor-sporting", nombre: "Defensor Sporting", afId: 2350, espnId: "1007" },
  { slug: "boston-river", nombre: "Boston River", afId: 2361, espnId: "9999" },
  { slug: "danubio", nombre: "Danubio", afId: 2352, espnId: "4817" },
  { slug: "juventud", nombre: "Juventud", afId: 2353, espnId: "8416" },
  { slug: "progreso", nombre: "Progreso", afId: 2363, espnId: "6866" },
  { slug: "cerro", nombre: "Cerro", afId: 2362, espnId: "5490" },
] as const;

export type TablaAnualRow = {
  rank: number;
  nombre: string;
  escudo: string;
  puntos: number;
  jugados: number;
};

export function computeTablaAnual(
  apertura: StandingRow[],
  intermedio: EspnStandingRow[],
  clausura: StandingRow[],
): TablaAnualRow[] {
  const filas = EQUIPOS.map((eq) => {
    const enApertura = apertura.find((r) => r.teamId === eq.afId);
    const enClausura = clausura.find((r) => r.teamId === eq.afId);
    const enIntermedio = intermedio.find((r) => r.teamId === eq.espnId);

    const puntos = (enApertura?.puntos ?? 0) + (enIntermedio?.puntos ?? 0) + (enClausura?.puntos ?? 0);
    const jugados = (enApertura?.jugados ?? 0) + (enIntermedio?.jugados ?? 0) + (enClausura?.jugados ?? 0);
    const escudo = enApertura?.escudo ?? enIntermedio?.escudo ?? "";

    return { nombre: eq.nombre, escudo, puntos, jugados };
  });

  return filas
    .sort((a, b) => b.puntos - a.puntos)
    .map((fila, i) => ({ rank: i + 1, ...fila }));
}
