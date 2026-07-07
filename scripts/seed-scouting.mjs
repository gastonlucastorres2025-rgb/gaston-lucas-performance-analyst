import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jsonPath = process.argv[2];

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.",
  );
  process.exit(1);
}

if (!jsonPath) {
  console.error("Uso: node scripts/seed-scouting.mjs <ruta-al-json-limpio>");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const rows = JSON.parse(readFileSync(jsonPath, "utf-8"));

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, nombre")
    .limit(1)
    .single();

  if (teamError) throw teamError;
  console.log("Cargando scouting para:", team.nombre);

  const payload = rows.map((r) => ({ ...r, team_id: team.id }));

  const { data, error } = await supabase
    .from("scouting_targets")
    .insert(payload)
    .select();

  if (error) throw error;
  console.log(`Listo: ${data.length} jugadores de scouting cargados.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
