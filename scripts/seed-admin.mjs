import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.",
  );
  process.exit(1);
}

const EMAIL = process.env.SEED_ADMIN_EMAIL;
const PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const NOMBRE = process.env.SEED_ADMIN_NOMBRE ?? "Admin";
const EQUIPO_NOMBRE = process.env.SEED_TEAM_NOMBRE ?? "Mi Equipo";
const EQUIPO_CATEGORIA = process.env.SEED_TEAM_CATEGORIA || null;
const EQUIPO_TEMPORADA = process.env.SEED_TEAM_TEMPORADA || null;

if (!EMAIL || !PASSWORD) {
  console.error("Faltan SEED_ADMIN_EMAIL o SEED_ADMIN_PASSWORD en el entorno.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      nombre: EQUIPO_NOMBRE,
      categoria: EQUIPO_CATEGORIA,
      temporada: EQUIPO_TEMPORADA,
    })
    .select()
    .single();

  if (teamError) throw teamError;
  console.log("Equipo creado:", team.id, team.nombre);

  const { data: userData, error: userError } =
    await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });

  if (userError) throw userError;
  console.log("Usuario creado:", userData.user.id, userData.user.email);

  const { error: staffError } = await supabase.from("staff_users").insert({
    id: userData.user.id,
    team_id: team.id,
    nombre: NOMBRE,
    rol: "admin",
    email: EMAIL,
  });

  if (staffError) throw staffError;
  console.log("Listo. Ya podes loguearte con", EMAIL);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
