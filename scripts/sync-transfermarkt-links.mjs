import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const LINKS = [
  { nombre: "Ignacio", apellido: "Suárez", url: "https://www.transfermarkt.us/ignacio-suarez/profil/spieler/657760" },
  { nombre: "Alexis", apellido: "Martín Arias", url: "https://www.transfermarkt.us/alexis-martin-arias/profil/spieler/360521" },
  { nombre: "Luis", apellido: "Mejía", url: "https://www.transfermarkt.us/luis-mejia/profil/spieler/76715" },
  { nombre: "Francisco", apellido: "Calvo", url: "https://www.transfermarkt.us/francisco-calvo/profil/spieler/188470" },
  { nombre: "Agustín", apellido: "Rogel", url: "https://www.transfermarkt.us/agustin-rogel/profil/spieler/456535" },
  { nombre: "Paolo", apellido: "Calione", url: "https://www.transfermarkt.us/paolo-calione/profil/spieler/997825" },
  { nombre: "Tomás", apellido: "Viera", url: "https://www.transfermarkt.us/tomas-viera/profil/spieler/1310240" },
  { nombre: "Sebastián", apellido: "Coates", url: "https://www.transfermarkt.us/sebastian-coates/profil/spieler/102427" },
  { nombre: "Camilo", apellido: "Cándido", url: "https://www.transfermarkt.us/camilo-candido/profil/spieler/382473" },
  { nombre: "Federico", apellido: "Bais", url: "https://www.transfermarkt.us/federico-bais/profil/spieler/1379675" },
  { nombre: "Juan", apellido: "Pintado", url: "https://www.transfermarkt.us/juan-pintado/profil/spieler/410456" },
  { nombre: "Emiliano", apellido: "Ancheta", url: "https://www.transfermarkt.us/emiliano-ancheta/profil/spieler/577406" },
  { nombre: "Facundo", apellido: "González", url: "https://www.transfermarkt.us/facundo-gonzalez/profil/spieler/1232131" },
  { nombre: "Nicolás", apellido: "Rodríguez", url: "https://www.transfermarkt.us/nicolas-rodriguez/profil/spieler/196187" },
  { nombre: "Bruno", apellido: "Zuculini", url: "https://www.transfermarkt.us/bruno-zuculini/profil/spieler/115507" },
  { nombre: "Mauricio", apellido: "Vera", url: "https://www.transfermarkt.us/mauricio-vera/profil/spieler/697408" },
  { nombre: "Juan Ignacio", apellido: "García", url: "https://www.transfermarkt.us/juan-ignacio-garcia/profil/spieler/1021366" },
  { nombre: "Luciano", apellido: "Boggio", url: "https://www.transfermarkt.us/luciano-boggio/profil/spieler/577259" },
  { nombre: "Baltasar", apellido: "Barcia", url: "https://www.transfermarkt.us/baltasar-barcia/profil/spieler/891569" },
  { nombre: "Agustín", apellido: "Dos Santos", url: "https://www.transfermarkt.us/agustin-dos-santos/profil/spieler/1339507" },
  { nombre: "Lucas", apellido: "Rodríguez", url: "https://www.transfermarkt.us/lucas-rodriguez/profil/spieler/338641" },
  { nombre: "Nicolás", apellido: "Lodeiro", url: "https://www.transfermarkt.us/nicolas-lodeiro/profil/spieler/72653" },
  { nombre: "Juan Cruz", apellido: "de los Santos", url: "https://www.transfermarkt.us/juan-cruz-de-los-santos/profil/spieler/988662" },
  { nombre: "Rodrigo", apellido: "Martínez", url: "https://www.transfermarkt.us/rodrigo-martinez/profil/spieler/1379671" },
  { nombre: "Bruno", apellido: "Arady", url: "https://www.transfermarkt.us/bruno-arady/profil/spieler/1228248" },
  { nombre: "Exequiel", apellido: "Mereles", url: "https://www.transfermarkt.us/exequiel-mereles/profil/spieler/898379" },
  { nombre: "Tomás", apellido: "Verón Lupi", url: "https://www.transfermarkt.us/tomas-veron-lupi/profil/spieler/624096" },
  { nombre: "Maxi", apellido: "Gómez", url: "https://www.transfermarkt.us/maxi-gomez/profil/spieler/396894" },
  { nombre: "Maximiliano", apellido: "Silvera", url: "https://www.transfermarkt.us/maximiliano-silvera/profil/spieler/365827" },
  { nombre: "Nicolás", apellido: "López", url: "https://www.transfermarkt.us/nicolas-lopez/profil/spieler/185593" },
  { nombre: "Gonzalo", apellido: "Carneiro", url: "https://www.transfermarkt.us/gonzalo-carneiro/profil/spieler/403014" },
  { nombre: "Pavel", apellido: "Núñez", url: "https://www.transfermarkt.us/pavel-nunez/profil/spieler/1372201" },
];

async function main() {
  let updated = 0;
  for (const entry of LINKS) {
    const { data, error } = await supabase
      .from("players")
      .update({ transfermarkt_url: entry.url })
      .eq("nombre", entry.nombre)
      .eq("apellido", entry.apellido)
      .select();
    if (error) throw error;
    if (!data.length) {
      console.warn(`No encontrado: ${entry.nombre} ${entry.apellido}`);
      continue;
    }
    updated += 1;
  }
  console.log(`Listo: ${updated} jugadores actualizados con link de Transfermarkt.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
