import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: true,
  isArray: (name) => ["instance", "row"].includes(name),
  maxNestedTags: 100000,
});

type RawInstance = { code: string | number; start: string | number; end: string | number };
type RawRow = { code: string | number; R: string | number; G: string | number; B: string | number };

export type CategoriaParseada = { codigo: string; colorHex: string };
export type AccionParseada = { codigo: string; inicio: number; fin: number };

function canal8bit(valor16bit: number): number {
  return Math.round((valor16bit / 65535) * 255);
}

function rgbHex(r: number, g: number, b: number): string {
  const hex = (v: number) => canal8bit(v).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function parsearXmlNacsport(xml: string): {
  categorias: CategoriaParseada[];
  acciones: AccionParseada[];
} {
  const data = parser.parse(xml);
  const file = data.file;
  if (!file) throw new Error("El XML no tiene el formato esperado (falta <file>).");

  const rows: RawRow[] = file.ROWS?.row ?? [];
  const categorias: CategoriaParseada[] = rows.map((r) => ({
    codigo: String(r.code).trim(),
    colorHex: rgbHex(Number(r.R), Number(r.G), Number(r.B)),
  }));

  const instances: RawInstance[] = file.ALL_INSTANCES?.instance ?? [];
  if (instances.length === 0) {
    throw new Error("El XML no tiene instancias en <ALL_INSTANCES>.");
  }

  const acciones: AccionParseada[] = instances
    .map((inst) => ({
      codigo: String(inst.code).trim(),
      inicio: Number(inst.start),
      fin: Number(inst.end),
    }))
    .sort((a, b) => a.inicio - b.inicio);

  // Si el XML no trae <ROWS> (algunas exportaciones no la incluyen), derivamos
  // las categorías directamente de los códigos usados en las instancias.
  if (categorias.length === 0) {
    const vistos = new Set<string>();
    for (const a of acciones) {
      if (!vistos.has(a.codigo)) {
        vistos.add(a.codigo);
        categorias.push({ codigo: a.codigo, colorHex: "#5f5e5a" });
      }
    }
  }

  return { categorias, acciones };
}
