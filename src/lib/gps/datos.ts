import type { SupabaseClient } from "@supabase/supabase-js";
import type { CargaDiaria, DiaCarga, Posicion } from "@/lib/gps/calculos";

// El módulo GPS no depende de la tabla `players`: el jugador se identifica por el nombre tal cual lo
// manda el proveedor (gps_registros.nombre_proveedor_crudo), así el historial sobrevive a un cambio
// de club. La posición y el "activo" viven en gps_jugadores, que edita el preparador físico.

const TAMANO_PAGINA = 1000; // tope por consulta de Supabase: sin paginar se pierden filas en silencio.

type FilaRegistro = {
  nombre_proveedor_crudo: string | null;
  distancia_total_m: number | null;
  dist_alta_velocidad_m: number | null;
  dist_muy_alta_velocidad_m: number | null;
  aceleraciones_cant: number | null;
  desaceleraciones_cant: number | null;
  velocidad_maxima_kmh: number | null;
  gps_sesiones: { fecha: string } | { fecha: string }[] | null;
};

/** El mismo jugador puede venir escrito distinto entre archivos ("Luciano Montaos" / "LUCIANO MONTAOS"):
 * se unifica a mayúsculas, sin acentos y con espacios simples antes de agrupar. */
export function normalizarNombre(nombre: string): string {
  return nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}

function fechaDeSesion(s: FilaRegistro["gps_sesiones"]): string | null {
  if (!s) return null;
  return Array.isArray(s) ? (s[0]?.fecha ?? null) : s.fecha;
}

/** Carga diaria por jugador: si hay más de una sesión el mismo día (mañana + tarde) se suman las
 * tres variables y la velocidad máxima queda con el pico (no se suma). En un día de partido el
 * total ya es el de los dos tiempos (el importador lo arma así). */
export async function cargarCargaDiaria(supabase: SupabaseClient, club: string): Promise<CargaDiaria> {
  const carga: CargaDiaria = new Map();

  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await supabase
      .from("gps_registros")
      .select(
        "nombre_proveedor_crudo, distancia_total_m, dist_alta_velocidad_m, dist_muy_alta_velocidad_m, aceleraciones_cant, desaceleraciones_cant, velocidad_maxima_kmh, gps_sesiones!inner(fecha, club)",
      )
      .eq("gps_sesiones.club", club)
      .order("id")
      .range(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw new Error(`No se pudo leer la carga GPS: ${error.message}`);
    const filas = (data ?? []) as unknown as FilaRegistro[];

    for (const f of filas) {
      const nombre = f.nombre_proveedor_crudo ? normalizarNombre(f.nombre_proveedor_crudo) : null;
      const fecha = fechaDeSesion(f.gps_sesiones);
      if (!nombre || !fecha) continue;

      let porDia = carga.get(nombre);
      if (!porDia) carga.set(nombre, (porDia = new Map<string, DiaCarga>()));
      const dia = porDia.get(fecha) ?? { DIST: 0, HSR: 0, D_SPR: 0, ACE: 0, DES: 0, maxSpeed: null };
      dia.DIST += f.distancia_total_m ?? 0;
      dia.HSR += f.dist_alta_velocidad_m ?? 0;
      dia.D_SPR += f.dist_muy_alta_velocidad_m ?? 0;
      dia.ACE += f.aceleraciones_cant ?? 0;
      dia.DES += f.desaceleraciones_cant ?? 0;
      if (f.velocidad_maxima_kmh != null) dia.maxSpeed = Math.max(dia.maxSpeed ?? 0, f.velocidad_maxima_kmh);
      porDia.set(fecha, dia);
    }

    if (filas.length < TAMANO_PAGINA) break;
  }

  return carga;
}

export type JugadorGps = { nombre: string; posicion: Posicion; activo: boolean; guardado: boolean };

/** Plantel = jugadores guardados por el preparador + los que aparecen en el GPS y todavía no tienen
 * fila (esos salen como "Sin posición", activos, hasta que se les asigne una). */
export async function listarPlantel(supabase: SupabaseClient, carga: CargaDiaria, club: string): Promise<JugadorGps[]> {
  const { data, error } = await supabase.from("gps_jugadores").select("nombre, posicion, activo").eq("club", club);
  if (error) throw new Error(`No se pudo leer el plantel GPS: ${error.message}`);

  const porNombre = new Map<string, JugadorGps>();
  for (const j of data ?? []) {
    porNombre.set(j.nombre, { nombre: j.nombre, posicion: j.posicion as Posicion, activo: j.activo, guardado: true });
  }
  for (const nombre of carga.keys()) {
    if (!porNombre.has(nombre)) porNombre.set(nombre, { nombre, posicion: "N/D", activo: true, guardado: false });
  }
  return Array.from(porNombre.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export type EstadoLesion = "Activa" | "En recuperación" | "Alta";

export type Lesion = {
  id: string;
  jugador: string;
  fecha: string;
  tipo: "Molestia" | "Lesión";
  zona: string;
  estado: EstadoLesion;
  notas: string;
  fechaAlta: string | null;
};

export async function listarLesiones(supabase: SupabaseClient, club: string): Promise<Lesion[]> {
  const { data, error } = await supabase
    .from("gps_lesiones")
    .select("id, jugador, fecha, tipo, zona, estado, notas, fecha_alta")
    .eq("club", club)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`No se pudieron leer las lesiones: ${error.message}`);
  return (data ?? []).map((l) => ({
    id: l.id,
    jugador: l.jugador,
    fecha: l.fecha,
    tipo: l.tipo,
    zona: l.zona,
    estado: l.estado,
    notas: l.notas,
    fechaAlta: l.fecha_alta,
  }));
}

/** Estado de lesión vigente de un jugador: el registro de fecha más reciente (una recaída posterior
 * a un alta gana), o null si nunca tuvo registro. */
export function lesionVigente(lesiones: Lesion[], jugador: string): Lesion | null {
  const propias = lesiones.filter((l) => l.jugador === jugador).sort((a, b) => b.fecha.localeCompare(a.fecha));
  return propias[0] ?? null;
}

export type ContextoGps = { teamId: string; puedeEditar: boolean };

/** Equipo del usuario y si puede editar el módulo GPS (preparador físico o admin). Es solo para
 * decidir qué mostrar: la autorización real la hace la RLS (`puede_editar_gps()`). */
export async function obtenerContextoGps(supabase: SupabaseClient): Promise<ContextoGps | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: staff } = await supabase.from("staff_users").select("team_id, rol").eq("id", user.id).single();
  if (!staff) return null;
  return { teamId: staff.team_id, puedeEditar: staff.rol === "admin" || staff.rol === "preparador_fisico" };
}

/** Fechas de los partidos del equipo (planilla de partidos que alimenta Videoanálisis), para calcular
 * el MD de cada día de entrenamiento. */
export async function listarFechasPartidos(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.from("partidos_va").select("fecha");
  if (error) throw new Error(`No se pudieron leer los partidos: ${error.message}`);
  return Array.from(new Set((data ?? []).map((p) => p.fecha as string))).sort();
}
