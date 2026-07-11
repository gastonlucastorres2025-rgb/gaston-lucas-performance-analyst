import { escudoClubUruguayo } from "@/lib/uruguay-clubs";

const NACIONAL_NOMBRE = "Nacional";
const NACIONAL_ESCUDO = "/escudo-nacional.png";

export function equiposPlaca(partido: {
  rival: string;
  condicion: string | null;
  goles_favor: number | null;
  goles_contra: number | null;
}) {
  const nacional = { nombre: NACIONAL_NOMBRE, escudo: NACIONAL_ESCUDO, goles: partido.goles_favor };
  const rival = { nombre: partido.rival, escudo: escudoClubUruguayo(partido.rival), goles: partido.goles_contra };

  return partido.condicion === "visitante" ? { local: rival, visitante: nacional } : { local: nacional, visitante: rival };
}
