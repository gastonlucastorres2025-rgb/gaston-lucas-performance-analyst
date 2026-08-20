import type { EspnStandingRow } from "@/lib/espn-uruguay";

export const EQUIPOS = [
  { slug: "deportivo-maldonado", nombre: "Deportivo Maldonado", espnId: "10000" },
  { slug: "racing", nombre: "Racing", espnId: "9903" },
  { slug: "penarol", nombre: "Peñarol", espnId: "2683" },
  { slug: "albion", nombre: "Albion", espnId: "21403" },
  { slug: "nacional", nombre: "Nacional", espnId: "2684" },
  { slug: "central-espanol", nombre: "Central Español", espnId: "131688" },
  { slug: "torque", nombre: "Torque", espnId: "19002" },
  { slug: "wanderers", nombre: "Wanderers", espnId: "5501" },
  { slug: "liverpool", nombre: "Liverpool", espnId: "5492" },
  { slug: "cerro-largo", nombre: "Cerro Largo", espnId: "9902" },
  { slug: "defensor-sporting", nombre: "Defensor Sporting", espnId: "1007" },
  { slug: "boston-river", nombre: "Boston River", espnId: "9999" },
  { slug: "danubio", nombre: "Danubio", espnId: "4817" },
  { slug: "juventud", nombre: "Juventud", espnId: "8416" },
  { slug: "progreso", nombre: "Progreso", espnId: "6866" },
  { slug: "cerro", nombre: "Cerro", espnId: "5490" },
] as const;

export type TablaAnualRow = {
  rank: number;
  nombre: string;
  escudo: string;
  puntos: number;
  jugados: number;
};

export function computeTablaAnual(
  apertura: EspnStandingRow[],
  intermedio: EspnStandingRow[],
  clausura: EspnStandingRow[],
): TablaAnualRow[] {
  const filas = EQUIPOS.map((eq) => {
    const enApertura = apertura.find((r) => r.teamId === eq.espnId);
    const enClausura = clausura.find((r) => r.teamId === eq.espnId);
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
