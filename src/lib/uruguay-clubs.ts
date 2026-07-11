import { EQUIPOS } from "@/lib/tabla-anual";

export const NOMBRES_CLUBES_URUGUAYOS = EQUIPOS.map((e) => e.nombre);

export function escudoClubUruguayo(nombre: string): string | null {
  const club = EQUIPOS.find((e) => e.nombre === nombre);
  return club ? `https://a.espncdn.com/i/teamlogos/soccer/500/${club.espnId}.png` : null;
}
