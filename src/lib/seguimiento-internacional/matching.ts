export type CandidatoJugador = {
  fullName: string;
  currentClub: string | null;
  primaryPosition: string | null;
  height: number | null;
  preferredFoot: string | null;
};

export type JugadorExistente = CandidatoJugador & {
  id: string;
  normalizedName: string;
};

export type NivelConfianza = "alta" | "media" | "baja";

export type ResultadoCoincidencia = {
  jugador: JugadorExistente;
  score: number;
  nivel: NivelConfianza;
  camposCoincidentes: string[];
  camposDiferentes: string[];
};

// Umbrales de confianza (sección 10 del diseño): nunca se basan en el dorsal, que ni
// siquiera forma parte de este cálculo — solo nombre, club, posición, altura y pie.
const UMBRAL_ALTA = 0.82;
const UMBRAL_MEDIA = 0.5;

export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function distanciaLevenshtein(a: string, b: string): number {
  const filas = a.length + 1;
  const columnas = b.length + 1;
  const dp: number[][] = Array.from({ length: filas }, (_, i) => [i, ...Array(columnas - 1).fill(0)]);
  for (let j = 0; j < columnas; j++) dp[0][j] = j;

  for (let i = 1; i < filas; i++) {
    for (let j = 1; j < columnas; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + costo);
    }
  }
  return dp[filas - 1][columnas - 1];
}

function similitud(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distanciaLevenshtein(a, b) / maxLen;
}

// Compara nombres tolerando orden invertido (nombre-apellido vs apellido-nombre) y
// nombres compuestos: se prueba la comparación directa y con las palabras invertidas,
// quedándose con la mejor (sección 9 del diseño).
function similitudNombres(a: string, b: string): number {
  const directa = similitud(a, b);
  const palabrasA = a.split(" ");
  const palabrasB = b.split(" ");
  const invertidaA = [...palabrasA].reverse().join(" ");
  const invertida = similitud(invertidaA, b) || similitud(a, [...palabrasB].reverse().join(" "));
  return Math.max(directa, invertida);
}

function nivelDe(score: number): NivelConfianza {
  if (score >= UMBRAL_ALTA) return "alta";
  if (score >= UMBRAL_MEDIA) return "media";
  return "baja";
}

export function calcularCoincidencia(candidato: CandidatoJugador, existente: JugadorExistente): ResultadoCoincidencia {
  const nombreCandidato = normalizarNombre(candidato.fullName);
  const simNombre = similitudNombres(nombreCandidato, existente.normalizedName);

  const camposCoincidentes: string[] = [];
  const camposDiferentes: string[] = [];

  if (simNombre >= 0.85) camposCoincidentes.push("nombre");
  else if (simNombre < 0.5) camposDiferentes.push("nombre");

  let scoreClub = 0.5; // neutro si falta el dato en alguno de los dos lados
  if (candidato.currentClub && existente.currentClub) {
    scoreClub = normalizarNombre(candidato.currentClub) === normalizarNombre(existente.currentClub) ? 1 : 0;
    if (scoreClub === 1) camposCoincidentes.push("club");
    else camposDiferentes.push("club");
  }

  let scorePosicion = 0.5;
  if (candidato.primaryPosition && existente.primaryPosition) {
    scorePosicion = normalizarNombre(candidato.primaryPosition) === normalizarNombre(existente.primaryPosition) ? 1 : 0;
    if (scorePosicion === 1) camposCoincidentes.push("posición");
    else camposDiferentes.push("posición");
  }

  let scoreAltura = 0.5;
  if (candidato.height && existente.height) {
    scoreAltura = Math.abs(candidato.height - existente.height) <= 3 ? 1 : 0;
    if (scoreAltura === 1) camposCoincidentes.push("altura");
    else camposDiferentes.push("altura");
  }

  let scorePie = 0.5;
  if (candidato.preferredFoot && existente.preferredFoot) {
    scorePie = candidato.preferredFoot === existente.preferredFoot ? 1 : 0;
    if (scorePie === 1) camposCoincidentes.push("pie hábil");
    else camposDiferentes.push("pie hábil");
  }

  // El nombre pesa la mayoría del puntaje: es la única señal realmente confiable con
  // los datos que traen las fuentes reales (los PDF/Sheets no incluyen nacionalidad ni
  // fecha de nacimiento exacta, solo edad aproximada).
  const score = simNombre * 0.6 + scoreClub * 0.15 + scorePosicion * 0.1 + scoreAltura * 0.1 + scorePie * 0.05;

  return { jugador: existente, score, nivel: nivelDe(score), camposCoincidentes, camposDiferentes };
}

export function buscarCoincidencias(candidato: CandidatoJugador, existentes: JugadorExistente[]): ResultadoCoincidencia[] {
  return existentes
    .map((existente) => calcularCoincidencia(candidato, existente))
    .sort((a, b) => b.score - a.score);
}
