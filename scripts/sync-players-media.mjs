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

// Fuente: perfiles individuales de Transfermarkt. Foto = null cuando
// Transfermarkt no tiene una foto propia del jugador (usa su imagen generica).
// Correr de nuevo despues de un mercado de pases para refrescar fotos/altura
// de jugadores nuevos; a los que ya tienen registro fisico no se los toca.
const MEDIA = [
  { nombre: "Ignacio", apellido: "Suárez", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/657760-1719941506.png?lm=1", altura: 1.84 },
  { nombre: "Alexis", apellido: "Martín Arias", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/360521-1772563993.PNG?lm=1", altura: 1.85 },
  { nombre: "Luis", apellido: "Mejía", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/76715-1719941459.png?lm=1", altura: 1.93 },
  { nombre: "Francisco", apellido: "Calvo", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/188470-1696346270.png?lm=1", altura: 1.84 },
  { nombre: "Agustín", apellido: "Rogel", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/456535-1695045310.jpg?lm=1", altura: 1.91 },
  { nombre: "Paolo", apellido: "Calione", foto_url: null, altura: null },
  { nombre: "Tomás", apellido: "Viera", foto_url: null, altura: null },
  { nombre: "Sebastián", apellido: "Coates", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/102427-1666100911.jpg?lm=1", altura: 1.96 },
  { nombre: "Camilo", apellido: "Cándido", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/382473-1738778860.jpg?lm=1", altura: 1.74 },
  { nombre: "Federico", apellido: "Bais", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/1379675-1773422473.jpeg?lm=1", altura: 1.75 },
  { nombre: "Juan", apellido: "Pintado", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/410456-1739197283.jpg?lm=1", altura: 1.72 },
  { nombre: "Emiliano", apellido: "Ancheta", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/577406-1720711976.jpg?lm=1", altura: 1.79 },
  { nombre: "Facundo", apellido: "González", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/1232131-1720819416.jpg?lm=1", altura: 1.79 },
  { nombre: "Nicolás", apellido: "Rodríguez", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/196187-1721082682.jpg?lm=1", altura: 1.83 },
  { nombre: "Bruno", apellido: "Zuculini", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/115507-1724349249.png?lm=1", altura: 1.82 },
  { nombre: "Mauricio", apellido: "Vera", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/697408-1742140987.png?lm=1", altura: 1.80 },
  { nombre: "Juan Ignacio", apellido: "García", foto_url: null, altura: null },
  { nombre: "Luciano", apellido: "Boggio", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/577259-1721935620.png?lm=1", altura: 1.75 },
  { nombre: "Baltasar", apellido: "Barcia", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/891569-1742147193.png?lm=1", altura: 1.82 },
  { nombre: "Agustín", apellido: "Dos Santos", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/1339507-1773422515.jpeg?lm=1", altura: 1.67 },
  { nombre: "Lucas", apellido: "Rodríguez", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/338641-1645270821.JPG?lm=1", altura: 1.70 },
  { nombre: "Nicolás", apellido: "Lodeiro", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/72653-1740864307.jpg?lm=1", altura: 1.73 },
  { nombre: "Juan Cruz", apellido: "de los Santos", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/988662-1720820219.jpg?lm=1", altura: 1.74 },
  { nombre: "Rodrigo", apellido: "Martínez", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/1379671-1773422484.jpeg?lm=1", altura: 1.75 },
  { nombre: "Bruno", apellido: "Arady", foto_url: null, altura: null },
  { nombre: "Exequiel", apellido: "Mereles", foto_url: null, altura: null },
  { nombre: "Tomás", apellido: "Verón Lupi", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/624096-1712765353.JPG?lm=1", altura: 1.73 },
  { nombre: "Maxi", apellido: "Gómez", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/396894-1743018634.png?lm=1", altura: 1.86 },
  { nombre: "Maximiliano", apellido: "Silvera", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/365827-1742487680.jpg?lm=1", altura: 1.76 },
  { nombre: "Nicolás", apellido: "López", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/185593-1700765951.jpg?lm=1", altura: 1.78 },
  { nombre: "Gonzalo", apellido: "Carneiro", foto_url: "https://img.a.transfermarkt.technology/portrait/medium/403014-1719947742.png?lm=1", altura: 1.95 },
  { nombre: "Pavel", apellido: "Núñez", foto_url: null, altura: null },
];

async function main() {
  let updated = 0;
  let heightsAdded = 0;
  let skipped = 0;

  for (const entry of MEDIA) {
    const { data: player, error: findError } = await supabase
      .from("players")
      .select("id")
      .eq("nombre", entry.nombre)
      .eq("apellido", entry.apellido)
      .maybeSingle();

    if (findError) throw findError;
    if (!player) {
      console.warn(`No encontrado en la base: ${entry.nombre} ${entry.apellido}`);
      continue;
    }

    if (entry.foto_url) {
      const { error: updateError } = await supabase
        .from("players")
        .update({ foto_url: entry.foto_url })
        .eq("id", player.id);

      if (updateError) throw updateError;
      updated += 1;
    }

    if (entry.altura) {
      const { count } = await supabase
        .from("player_physical_data")
        .select("id", { count: "exact", head: true })
        .eq("player_id", player.id);

      if (count && count > 0) {
        skipped += 1;
        continue;
      }

      const { error: physicalError } = await supabase
        .from("player_physical_data")
        .insert({
          player_id: player.id,
          altura: entry.altura,
          notas: "Fuente: Transfermarkt (altura). Peso pendiente de carga por el preparador físico.",
        });

      if (physicalError) throw physicalError;
      heightsAdded += 1;
    }
  }

  console.log(`Fotos actualizadas: ${updated}`);
  console.log(`Alturas cargadas: ${heightsAdded}`);
  console.log(`Jugadores con datos fisicos ya existentes (sin tocar): ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
