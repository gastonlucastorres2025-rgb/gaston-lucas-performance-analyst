import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Fuente: Transfermarkt, plantel de Club Nacional de Football (temporada 2026).
// Faltan fecha de nacimiento exacta, altura y pie habil: Transfermarkt solo
// expone eso en la ficha individual de cada jugador, no en el listado del plantel.
const PLAYERS = [
  { dorsal: 25, nombre: "Ignacio", apellido: "Suárez", posicion_principal: "Portero", nacionalidad: "Uruguay" },
  { dorsal: null, nombre: "Alexis", apellido: "Martín Arias", posicion_principal: "Portero", nacionalidad: "Argentina" },
  { dorsal: 1, nombre: "Luis", apellido: "Mejía", posicion_principal: "Portero", nacionalidad: "Panamá" },

  { dorsal: null, nombre: "Francisco", apellido: "Calvo", posicion_principal: "Defensor", nacionalidad: "Costa Rica" },
  { dorsal: 2, nombre: "Agustín", apellido: "Rogel", posicion_principal: "Defensor", nacionalidad: "Uruguay" },
  { dorsal: 15, nombre: "Paolo", apellido: "Calione", posicion_principal: "Defensor", nacionalidad: "Uruguay" },
  { dorsal: 32, nombre: "Tomás", apellido: "Viera", posicion_principal: "Defensor", nacionalidad: "Uruguay" },
  { dorsal: 4, nombre: "Sebastián", apellido: "Coates", posicion_principal: "Defensor", nacionalidad: "Uruguay" },
  { dorsal: 21, nombre: "Camilo", apellido: "Cándido", posicion_principal: "Defensor", nacionalidad: "Uruguay" },
  { dorsal: 34, nombre: "Federico", apellido: "Bais", posicion_principal: "Defensor", nacionalidad: "Uruguay" },
  { dorsal: 5, nombre: "Juan", apellido: "Pintado", posicion_principal: "Defensor", nacionalidad: "Uruguay" },
  { dorsal: 13, nombre: "Emiliano", apellido: "Ancheta", posicion_principal: "Defensor", nacionalidad: "Uruguay" },
  { dorsal: null, nombre: "Facundo", apellido: "González", posicion_principal: "Defensor", nacionalidad: "Uruguay" },
  { dorsal: 77, nombre: "Nicolás", apellido: "Rodríguez", posicion_principal: "Defensor", nacionalidad: "Uruguay" },

  { dorsal: 8, nombre: "Bruno", apellido: "Zuculini", posicion_principal: "Mediocampista", nacionalidad: "Argentina" },
  { dorsal: null, nombre: "Mauricio", apellido: "Vera", posicion_principal: "Mediocampista", nacionalidad: "Argentina" },
  { dorsal: 56, nombre: "Juan Ignacio", apellido: "García", posicion_principal: "Mediocampista", nacionalidad: "Uruguay" },
  { dorsal: 6, nombre: "Luciano", apellido: "Boggio", posicion_principal: "Mediocampista", nacionalidad: "Uruguay" },
  { dorsal: 30, nombre: "Baltasar", apellido: "Barcia", posicion_principal: "Mediocampista", nacionalidad: "Uruguay" },
  { dorsal: 10, nombre: "Agustín", apellido: "Dos Santos", posicion_principal: "Mediocampista", nacionalidad: "Uruguay" },
  { dorsal: 23, nombre: "Lucas", apellido: "Rodríguez", posicion_principal: "Mediocampista", nacionalidad: "Uruguay" },
  { dorsal: 14, nombre: "Nicolás", apellido: "Lodeiro", posicion_principal: "Mediocampista", nacionalidad: "Uruguay" },

  { dorsal: 19, nombre: "Juan Cruz", apellido: "de los Santos", posicion_principal: "Delantero", nacionalidad: "Uruguay" },
  { dorsal: 31, nombre: "Rodrigo", apellido: "Martínez", posicion_principal: "Delantero", nacionalidad: "Uruguay" },
  { dorsal: 26, nombre: "Bruno", apellido: "Arady", posicion_principal: "Delantero", nacionalidad: "Uruguay" },
  { dorsal: 24, nombre: "Exequiel", apellido: "Mereles", posicion_principal: "Delantero", nacionalidad: "Uruguay" },
  { dorsal: 27, nombre: "Tomás", apellido: "Verón Lupi", posicion_principal: "Delantero", nacionalidad: "Argentina" },
  { dorsal: 9, nombre: "Maxi", apellido: "Gómez", posicion_principal: "Delantero", nacionalidad: "Uruguay" },
  { dorsal: 11, nombre: "Maximiliano", apellido: "Silvera", posicion_principal: "Delantero", nacionalidad: "Uruguay" },
  { dorsal: 7, nombre: "Nicolás", apellido: "López", posicion_principal: "Delantero", nacionalidad: "Uruguay" },
  { dorsal: 20, nombre: "Gonzalo", apellido: "Carneiro", posicion_principal: "Delantero", nacionalidad: "Uruguay" },
  { dorsal: 18, nombre: "Pavel", apellido: "Núñez", posicion_principal: "Delantero", nacionalidad: "Uruguay" },
];

async function main() {
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, nombre")
    .limit(1)
    .single();

  if (teamError) throw teamError;
  console.log("Cargando plantel para:", team.nombre);

  const rows = PLAYERS.map((p) => ({
    team_id: team.id,
    nombre: p.nombre,
    apellido: p.apellido,
    posicion_principal: p.posicion_principal,
    nacionalidad: p.nacionalidad,
    dorsal: p.dorsal,
    estado: "activo",
  }));

  const { data, error } = await supabase.from("players").insert(rows).select();

  if (error) throw error;
  console.log(`Listo: ${data.length} jugadores cargados.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
