import { getDocumentProxy } from "unpdf";

export type FilaJugadorPdf = {
  nombre: string;
  edad: string | null;
  dorsal: string | null;
  posicion: string | null;
  altura: string | null;
  pieHabil: string | null;
  fechaNacimiento: string | null;
  tactico: string | null;
  tecnico: string | null;
  fisico: string | null;
  pagina: number;
};

export type ExtraccionPdf = {
  filas: FilaJugadorPdf[];
  confianza: number; // 0-1: proporción de páginas donde se reconoció la tabla
  paginasSinTabla: number[];
};

type Item = { texto: string; x: number; y: number };

// Encabezados esperados, tolerante a acentos, a que el texto venga partido en varias
// líneas (ej "Posició"/"n") y a que distintos informes usen palabras distintas para lo
// mismo (ej. "Nombre" vs "Jugador", "Altura" vs "Estatura" — verificado contra dos
// formatos reales de PDF que conviven en el mismo Drive).
const ENCABEZADOS: { clave: keyof Omit<FilaJugadorPdf, "pagina">; patrones: RegExp[] }[] = [
  { clave: "nombre", patrones: [/^nombre$/i, /^jugador$/i] },
  { clave: "edad", patrones: [/^edad$/i] },
  { clave: "dorsal", patrones: [/^n\*?$/i, /^n°$/i] },
  { clave: "posicion", patrones: [/^posici/i] },
  { clave: "altura", patrones: [/^altura$/i, /^estatura$/i] },
  { clave: "pieHabil", patrones: [/^pierna/i, /^h[aá]bil$/i] },
  { clave: "fechaNacimiento", patrones: [/^fecha$/i, /^nacimiento$/i] },
  { clave: "tactico", patrones: [/^t[aá]ctico$/i] },
  { clave: "tecnico", patrones: [/^t[eé]cnico$/i] },
  { clave: "fisico", patrones: [/^f[ií]sico$/i] },
];

function normalizar(s: string): string {
  return s.trim();
}

async function itemsDePagina(pdf: Awaited<ReturnType<typeof getDocumentProxy>>, numPagina: number): Promise<Item[]> {
  const page = await pdf.getPage(numPagina);
  const content = await page.getTextContent();
  return content.items
    .map((it) => {
      const texto = "str" in it ? it.str : "";
      const transform = "transform" in it ? it.transform : [0, 0, 0, 0, 0, 0];
      return { texto: normalizar(texto), x: transform[4], y: transform[5] };
    })
    .filter((it) => it.texto.length > 0);
}

// Un texto matchea un patrón de encabezado, pero además tiene que ser corto: frases del
// propio análisis pueden empezar con la misma palabra (ej. "pierna hábil. Se cierra en
// momentos..." matchea /^pierna/i igual que la etiqueta "Pierna" del encabezado) — la
// longitud es lo que distingue una etiqueta real de una coincidencia de texto libre.
function esEtiquetaEncabezado(texto: string): keyof Omit<FilaJugadorPdf, "pagina"> | null {
  if (texto.length > 12) return null;
  for (const { clave, patrones } of ENCABEZADOS) {
    if (patrones.some((p) => p.test(texto))) return clave;
  }
  return null;
}

// Encuentra la posición x de cada columna a partir de la fila de encabezado real de
// esta página (no se hardcodea un layout fijo: cada informe puede tener anchos
// distintos, pero se espera el mismo orden y los mismos nombres de columna).
function detectarColumnas(items: Item[]): { clave: keyof Omit<FilaJugadorPdf, "pagina">; x: number }[] | null {
  // Los encabezados suelen compartir una franja de "y" angosta (misma fila), a veces
  // partidos en dos líneas (ej "Posició" / "n") con "y" levemente distinta.
  const candidatos: { clave: keyof Omit<FilaJugadorPdf, "pagina">; x: number; y: number }[] = [];

  for (const item of items) {
    const clave = esEtiquetaEncabezado(item.texto);
    if (clave && !candidatos.some((c) => c.clave === clave)) {
      candidatos.push({ clave, x: item.x, y: item.y });
    }
  }

  // Se exige encontrar al menos nombre + tactico + tecnico + fisico para confiar en que
  // esta página realmente tiene la tabla esperada (y no otro tipo de documento).
  const claves = new Set(candidatos.map((c) => c.clave));
  if (!claves.has("nombre") || !claves.has("tactico") || !claves.has("tecnico") || !claves.has("fisico")) {
    return null;
  }

  return candidatos.sort((a, b) => a.x - b.x).map(({ clave, x }) => ({ clave, x }));
}

const COLUMNAS_PARRAFO_KEYS = new Set(["tactico", "tecnico", "fisico"]);

// Un párrafo largo puede arrancar más cerca del límite entre columnas de lo que separa
// a las columnas angostas de identidad entre sí (nombre/edad/posición/altura/pie son
// todas cortas, pero el hueco hasta "Táctico" puede ser grande) — si el texto es
// evidentemente un párrafo (largo o con varias palabras), solo compite por las 3
// columnas de texto libre, nunca por las columnas cortas, para no quedar mal asignado
// al límite equivocado.
function asignarColumna(
  item: { texto: string; x: number },
  columnas: { clave: keyof Omit<FilaJugadorPdf, "pagina">; x: number }[],
): keyof Omit<FilaJugadorPdf, "pagina"> {
  const esParrafo = item.texto.length > 20 || item.texto.split(/\s+/).length >= 4;
  const candidatas = esParrafo ? columnas.filter((c) => COLUMNAS_PARRAFO_KEYS.has(c.clave)) : columnas;
  const lista = candidatas.length > 0 ? candidatas : columnas;

  let elegida = lista[0].clave;
  for (let i = 0; i < lista.length; i++) {
    const limiteIzq = i === 0 ? -Infinity : (lista[i - 1].x + lista[i].x) / 2;
    const limiteDer = i === lista.length - 1 ? Infinity : (lista[i].x + lista[i + 1].x) / 2;
    if (item.x >= limiteIzq && item.x < limiteDer) {
      elegida = lista[i].clave;
      break;
    }
  }
  return elegida;
}

const RE_EDAD_DORSAL = /^\d{1,3}$/;
// Tolera la variante sin "s" que aparece en algunos documentos por error de tipeo
// ("Ambidietro" en vez de "Ambidiestro").
const RE_PIE = /^(derech[oa]|izquierd[oa]|ambidi[e]?[s]?tr[oa])$/i;

function esFilaIdentidad(itemsDeEstaFila: Item[], columnas: { clave: string; x: number }[]): boolean {
  // Una fila de jugador real tiene, en la franja angosta izquierda, edad+dorsal
  // numéricos y el pie hábil como palabra reconocida — no aparece en las filas de
  // encabezado ni en el texto libre de los párrafos.
  const tieneNumeros = itemsDeEstaFila.some((it) => RE_EDAD_DORSAL.test(it.texto));
  const tienePie = itemsDeEstaFila.some((it) => RE_PIE.test(it.texto));
  return tieneNumeros && tienePie;
}

async function extraerFilasDePagina(pdf: Awaited<ReturnType<typeof getDocumentProxy>>, numPagina: number): Promise<FilaJugadorPdf[] | null> {
  const items = await itemsDePagina(pdf, numPagina);
  const columnas = detectarColumnas(items);
  if (!columnas) return null;

  const xMinTabla = Math.min(...columnas.map((c) => c.x)) - 60; // margen para la columna "Imagen"
  // Algunas etiquetas del encabezado vienen partidas en dos líneas de distinta "y"
  // (ej. "Posició"/"n", "Pierna"/"hábil") — hay que descartar toda esa franja, no solo
  // la línea principal, por eso se usa el mínimo (el fragmento más bajo) y no el máximo.
  const yEncabezado = Math.min(...items.filter((it) => esEtiquetaEncabezado(it.texto) !== null).map((it) => it.y));

  const itemsTabla = items.filter((it) => it.x >= xMinTabla && it.y < yEncabezado - 2);

  // Agrupar por cercanía de "y" (no por "y" redondeada exacta: en algunos documentos el
  // nombre viene en dos líneas — "Táles" / "Wastowski" — y el resto de los datos de esa
  // misma fila quedan a menos de un punto de diferencia entre sí, pero ese punto de
  // diferencia alcanza para caer en dos "y" redondeadas distintas y partir la fila en
  // dos). Solo se agrupan los ítems de las columnas de identidad (antes de "táctico"):
  // los párrafos largos sí pueden estirarse muchas líneas y no deben fusionarse con la
  // fila siguiente.
  const itemsIdentidadZona = itemsTabla
    .filter((it) => !COLUMNAS_PARRAFO_KEYS.has(asignarColumna(it, columnas)))
    .sort((a, b) => b.y - a.y);

  const TOLERANCIA_FILA = 15; // menor que el salto típico entre filas (~40+), mayor que el salto entre líneas de un mismo dato (~1-8)
  const clusters: Item[][] = [];
  for (const it of itemsIdentidadZona) {
    const actual = clusters[clusters.length - 1];
    if (actual && actual[actual.length - 1].y - it.y <= TOLERANCIA_FILA) {
      actual.push(it);
    } else {
      clusters.push([it]);
    }
  }

  const identidades = clusters
    .filter((cluster) => esFilaIdentidad(cluster, columnas))
    .map((cluster) => cluster.reduce((suma, it) => suma + it.y, 0) / cluster.length)
    .sort((a, b) => b - a); // orden de lectura: "y" mayor primero (arriba de la página)

  if (identidades.length === 0) return null;

  const filas: FilaJugadorPdf[] = identidades.map((yIdentidad) => ({
    nombre: "",
    edad: null,
    dorsal: null,
    posicion: null,
    altura: null,
    pieHabil: null,
    fechaNacimiento: null,
    tactico: null,
    tecnico: null,
    fisico: null,
    pagina: numPagina,
  }));

  // Cada item de texto se asigna a la fila cuya "y" de identidad esté más cerca.
  const acumulado: Record<number, Record<string, { y: number; texto: string }[]>> = {};
  identidades.forEach((y) => (acumulado[y] = {}));

  for (const it of itemsTabla) {
    let mejorY = identidades[0];
    let mejorDist = Math.abs(it.y - identidades[0]);
    for (const y of identidades) {
      const dist = Math.abs(it.y - y);
      if (dist < mejorDist) {
        mejorDist = dist;
        mejorY = y;
      }
    }
    const clave = asignarColumna(it, columnas);
    if (!acumulado[mejorY][clave]) acumulado[mejorY][clave] = [];
    acumulado[mejorY][clave].push({ y: it.y, texto: it.texto });
  }

  identidades.forEach((y, i) => {
    const porColumna = acumulado[y];
    const fila = filas[i];
    for (const clave of Object.keys(porColumna) as (keyof typeof porColumna)[]) {
      const textoUnido = porColumna[clave]!
        .slice()
        .sort((a, b) => b.y - a.y)
        .map((t) => t.texto)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      (fila as unknown as Record<string, string>)[clave] = textoUnido;
    }
    fila.nombre = fila.nombre || "";
  });

  // Si "edad" o "dorsal" traen dos números separados (ej. "23 31"), es señal de que dos
  // jugadores quedaron fusionados en una sola fila (normalmente por un dato de pie hábil
  // que no matcheó el patrón esperado en el documento original) — se descarta en vez de
  // guardar un perfil corrupto. No se aplica a "altura": ahí un espacio es normal (ej.
  // "1,95 m"), no señal de fusión.
  const RE_DOS_NUMEROS = /\d+\s+\d+/;
  return filas.filter((f) => {
    if (f.nombre.trim().length === 0) return false;
    const sospechosa = [f.edad, f.dorsal].some((v) => v && RE_DOS_NUMEROS.test(v));
    return !sospechosa;
  });
}

export async function extraerJugadoresDePdf(buffer: Buffer): Promise<ExtraccionPdf> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const filas: FilaJugadorPdf[] = [];
  const paginasSinTabla: number[] = [];

  for (let numPagina = 1; numPagina <= pdf.numPages; numPagina++) {
    const filasDePagina = await extraerFilasDePagina(pdf, numPagina);
    if (filasDePagina === null) {
      paginasSinTabla.push(numPagina);
      continue;
    }
    filas.push(...filasDePagina);
  }

  const confianza = pdf.numPages > 0 ? (pdf.numPages - paginasSinTabla.length) / pdf.numPages : 0;
  return { filas, confianza, paginasSinTabla };
}
