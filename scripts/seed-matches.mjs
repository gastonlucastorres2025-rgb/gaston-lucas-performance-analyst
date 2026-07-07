import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const DANUBIO = "https://upload.wikimedia.org/wikipedia/commons/1/16/Escudo_oficial_de_Danubio_FC.png";
const WANDERERS = "https://upload.wikimedia.org/wikipedia/commons/d/d4/Escudo_del_Montevideo_Wanderers_Futbol_Club.png";
const PROGRESO = "https://upload.wikimedia.org/wikipedia/commons/0/0a/Escudo_Club_Atl%C3%A9tico_Progreso.png";
const TIGRE = "https://upload.wikimedia.org/wikipedia/commons/8/8a/Escudo_del_Club_Atl%C3%A9tico_Tigre.svg";

const ROWS = [
  {
    fecha: "2026-07-11",
    tipo: "partido",
    competencia: "Torneo Intermedio",
    ronda: "Fecha 5",
    rival: "Danubio FC",
    escudo_rival_url: DANUBIO,
    estadio: "Estadio Jardines del Hipódromo",
    condicion: "visitante",
  },
  {
    fecha: "2026-07-17",
    tipo: "partido",
    competencia: "Torneo Intermedio",
    ronda: "Fecha 6",
    rival: "Montevideo Wanderers",
    escudo_rival_url: WANDERERS,
    estadio: "Estadio Parque Víctor Alfredo Viera",
    condicion: "visitante",
  },
  {
    fecha: "2026-07-21",
    tipo: "partido",
    competencia: "Copa Sudamericana",
    ronda: "16avos de Final - Ida",
    rival: "Club Atlético Tigre",
    escudo_rival_url: TIGRE,
    estadio: "Estadio Gran Parque Central",
    condicion: "local",
  },
  {
    fecha: "2026-07-24",
    tipo: "partido",
    competencia: "Torneo Intermedio",
    ronda: "Fecha 7",
    rival: "Club Atlético Progreso",
    escudo_rival_url: PROGRESO,
    estadio: "Estadio Gran Parque Central",
    condicion: "local",
  },
  {
    fecha: "2026-07-27",
    tipo: "viaje",
    notas: "Viaje a Buenos Aires en barco",
  },
  {
    fecha: "2026-07-28",
    tipo: "partido",
    competencia: "Copa Sudamericana",
    ronda: "16avos de Final - Vuelta",
    rival: "Club Atlético Tigre",
    escudo_rival_url: TIGRE,
    estadio: "Estadio José Dellagiovanna",
    condicion: "visitante",
  },
];

async function main() {
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, nombre")
    .limit(1)
    .single();
  if (teamError) throw teamError;

  const payload = ROWS.map((r) => ({ ...r, team_id: team.id }));
  const { data, error } = await supabase.from("matches").insert(payload).select();
  if (error) throw error;
  console.log(`Listo: ${data.length} partidos/eventos cargados para ${team.nombre}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
