// Agregación de estadísticas de Videoanálisis a partir de los códigos ya tageados en
// va_acciones (Nacsport). No hay ninguna categoría "Remate" tageada todavía (confirmado
// contra los 21 partidos reales cargados) — queda para una etapa futura, una vez que se
// empiece a tagear. Tampoco hay relación real entre categorías (ej. FASE OFENSIVA no
// referencia ningún otro evento): todo lo de acá son conteos y duraciones por código,
// sin inferir solapes de tiempo entre categorías.

export type PartidoVAResumen = {
  id: string;
  fecha: string;
  rival: string;
  competencia: string | null;
  categoria: string | null;
  condicion: string | null;
  goles_favor: number | null;
  goles_contra: number | null;
};

export type AccionVAResumen = {
  partido_id: string;
  codigo: string;
  inicio_seg: number;
  fin_seg: number;
};

// Distintos partidos cargaron el mismo concepto con nombres de código distintos
// (verificado contra datos reales: "Tiro Libre AF"/"Tiros libres AF" conviven en la
// base). Se normalizan acá, sin tocar el dato original en Supabase.
const NORMALIZACION_CODIGO: Record<string, string> = {
  "Tiros libres AF": "Tiro Libre AF",
  "Tiros libres EC": "Tiro Libre EC",
};

export function normalizarCodigo(codigoCrudo: string): string {
  const limpio = codigoCrudo.trim();
  return NORMALIZACION_CODIGO[limpio] ?? limpio;
}

export type MetricaVA = { codigo: string; label: string; grupo: string; color: string };

// Catálogo de las categorías "núcleo": las que aparecen en la gran mayoría de los
// partidos (18-21 de 21, verificado) y por lo tanto sirven para comparar entre partidos,
// rivales y competencias. Categorías idiosincráticas (ej. "OTRO", "SALIDA DEL ARCO",
// tageadas en 1-2 partidos nada más) quedan afuera de este catálogo — no comparan bien
// en una serie porque la mayoría de los partidos no las tiene.
export const METRICAS_NUCLEO: MetricaVA[] = [
  { codigo: "FASE OFENSIVA", label: "Fases ofensivas", grupo: "Fases", color: "#59c544" },
  { codigo: "ZONA 1", label: "Zona 1 (propia)", grupo: "Zonas", color: "#4040cc" },
  { codigo: "ZONA 2 Y 3", label: "Zona 2 y 3 (rival)", grupo: "Zonas", color: "#0b3d91" },
  { codigo: "T OF", label: "Transición ofensiva", grupo: "Transiciones", color: "#d360b4" },
  { codigo: "T DEF", label: "Transición defensiva", grupo: "Transiciones", color: "#9c6ad3" },
  { codigo: "Corner AF", label: "Córners a favor", grupo: "Balón parado", color: "#0aa89e" },
  { codigo: "Corner EC", label: "Córners en contra", grupo: "Balón parado", color: "#f9869e" },
  { codigo: "Tiro Libre AF", label: "Tiros libres a favor", grupo: "Balón parado", color: "#59c544" },
  { codigo: "Tiro Libre EC", label: "Tiros libres en contra", grupo: "Balón parado", color: "#d7263d" },
  { codigo: "GOL AF", label: "Goles a favor", grupo: "Goles", color: "#049c23" },
  { codigo: "GOL EC", label: "Goles en contra", grupo: "Goles", color: "#9c0429" },
];

export type ConteoPartido = {
  partido: PartidoVAResumen;
  conteos: Record<string, number>;
  duracionSeg: Record<string, number>;
};

export function agregarPorPartido(partidos: PartidoVAResumen[], acciones: AccionVAResumen[]): ConteoPartido[] {
  const accionesPorPartido = new Map<string, AccionVAResumen[]>();
  for (const a of acciones) {
    const lista = accionesPorPartido.get(a.partido_id);
    if (lista) lista.push(a);
    else accionesPorPartido.set(a.partido_id, [a]);
  }

  return partidos.map((partido) => {
    const conteos: Record<string, number> = {};
    const duracionSeg: Record<string, number> = {};
    for (const a of accionesPorPartido.get(partido.id) ?? []) {
      const codigo = normalizarCodigo(a.codigo);
      conteos[codigo] = (conteos[codigo] ?? 0) + 1;
      duracionSeg[codigo] = (duracionSeg[codigo] ?? 0) + Math.max(0, a.fin_seg - a.inicio_seg);
    }
    return { partido, conteos, duracionSeg };
  });
}

export type OpcionesFiltro = { competencias: string[]; rivales: string[]; categorias: string[] };

export function opcionesFiltro(partidos: PartidoVAResumen[]): OpcionesFiltro {
  const competencias = [...new Set(partidos.map((p) => p.competencia).filter((v): v is string => !!v))].sort();
  const rivales = [...new Set(partidos.map((p) => p.rival))].sort();
  const categorias = [...new Set(partidos.map((p) => p.categoria).filter((v): v is string => !!v))].sort();
  return { competencias, rivales, categorias };
}

export function totalMetrica(conteosPorPartido: ConteoPartido[], codigo: string): number {
  return conteosPorPartido.reduce((acc, c) => acc + (c.conteos[codigo] ?? 0), 0);
}

export function promedioMetrica(conteosPorPartido: ConteoPartido[], codigo: string): number {
  if (conteosPorPartido.length === 0) return 0;
  return totalMetrica(conteosPorPartido, codigo) / conteosPorPartido.length;
}

// Chequeo simple de consistencia: compara los goles tageados como "GOL AF"/"GOL EC" en
// va_acciones contra el marcador cargado a mano en partidos_va.goles_favor/goles_contra.
// No corrige nada — sólo expone la discrepancia para que se pueda revisar el tageo.
export function discrepanciaGoles(c: ConteoPartido): { golesAfDiscrepa: boolean; golesEcDiscrepa: boolean } {
  const golAf = c.conteos["GOL AF"] ?? 0;
  const golEc = c.conteos["GOL EC"] ?? 0;
  return {
    golesAfDiscrepa: c.partido.goles_favor !== null && golAf !== c.partido.goles_favor,
    golesEcDiscrepa: c.partido.goles_contra !== null && golEc !== c.partido.goles_contra,
  };
}
