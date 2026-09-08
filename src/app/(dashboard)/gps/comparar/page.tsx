import { PageHeader } from "@/components/page-header";
import { GpsSubnav } from "@/components/gps/gps-subnav";
import { KpiCard } from "@/components/gps/kpi-card";
import { CAMPO_FECHA_CLASE, CampoSelect } from "@/components/gps/campo-select";
import { formatearNombreJugador } from "@/lib/gps-nombres";
import { GraficoCompararJugadores } from "@/components/gps/grafico-comparar-jugadores";
import { listarRegistrosDetallado, type GpsRegistroConSesion } from "@/lib/gps-data";
import { agruparPorJugador, compararPeriodos, PERIODOS_JUGADOR, resolverPeriodoJugador } from "@/lib/gps-comparativas";
import { METRICAS, promedioSimple } from "@/lib/gps-metricas";
import { obtenerCargaPartidosComoRegistros, obtenerPartidosReales, type PartidoGps } from "@/lib/gps-partidos";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Params = {
  vista?: string;
  jugadores?: string | string[];
  desde?: string;
  hasta?: string;
  tipo?: string;
  partido?: string;
  jugador?: string;
  periodoA?: string;
  periodoB?: string;
};

function sumarDia(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
function restarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

const TABS = [
  { valor: "jugadores", label: "Jugador vs. jugador" },
  { valor: "propio", label: "Jugador consigo mismo" },
];

function TabLink({ valor, activo }: { valor: string; activo: boolean }) {
  return (
    <a
      href={`/gps/comparar?vista=${valor}`}
      className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${activo ? "bg-primary text-white shadow-sm" : "text-foreground/55 hover:bg-primary/5 hover:text-foreground"}`}
    >
      {TABS.find((t) => t.valor === valor)?.label}
    </a>
  );
}

export default async function GpsCompararPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const vista = sp.vista ?? "jugadores";
  const supabase = await createClient();
  const [registros, partidos] = await Promise.all([listarRegistrosDetallado(supabase), obtenerPartidosReales(supabase)]);
  const porJugador = agruparPorJugador(registros);
  const nombresDisponibles = Array.from(porJugador.keys()).sort((a, b) => a.localeCompare(b));

  return (
    <div>
      <PageHeader title="GPS · Comparativas" description="Comparaciones calculadas sobre los datos reales del período — nunca se muestra un delta sin poder calcularlo de verdad." />
      <GpsSubnav />

      <div className="mb-6 inline-flex gap-1 rounded-xl border border-border bg-surface p-1 shadow-sm">
        {TABS.map((t) => (
          <TabLink key={t.valor} valor={t.valor} activo={vista === t.valor} />
        ))}
      </div>

      {vista === "jugadores" && (
        <VistaJugadores
          supabase={supabase}
          registros={registros}
          partidos={partidos}
          nombresDisponibles={nombresDisponibles}
          seleccionados={Array.isArray(sp.jugadores) ? sp.jugadores : sp.jugadores ? [sp.jugadores] : []}
          desde={sp.desde}
          hasta={sp.hasta}
          tipo={sp.tipo}
          partidoId={sp.partido}
        />
      )}
      {vista === "propio" && (
        <VistaPropio nombresDisponibles={nombresDisponibles} porJugador={porJugador} jugador={sp.jugador} periodoA={sp.periodoA} periodoB={sp.periodoB} />
      )}
    </div>
  );
}

const OPCIONES_TIPO = [
  { valor: "entrenamientos", label: "Solo entrenamientos" },
  { valor: "partidos", label: "Solo partidos" },
  { valor: "todos", label: "Entrenamientos + partidos" },
];

async function VistaJugadores({
  supabase,
  registros,
  partidos,
  nombresDisponibles,
  seleccionados,
  desde,
  hasta,
  tipo,
  partidoId,
}: {
  supabase: SupabaseClient;
  registros: GpsRegistroConSesion[];
  partidos: PartidoGps[];
  nombresDisponibles: string[];
  seleccionados: string[];
  desde?: string;
  hasta?: string;
  tipo?: string;
  partidoId?: string;
}) {
  const tipoEfectivo = tipo ?? "entrenamientos";
  const partidosOrdenados = partidos.slice().sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Elegir un partido en el selector fija el rango a la semana de ese microciclo — pisa las
  // fechas tipeadas a mano, para que sea un solo click en vez de calcular fechas.
  let desdeEfectivo = desde;
  let hastaEfectivo = hasta;
  if (partidoId) {
    const idx = partidosOrdenados.findIndex((p) => p.id === partidoId);
    if (idx !== -1) {
      const p = partidosOrdenados[idx];
      const anterior = partidosOrdenados[idx - 1];
      desdeEfectivo = anterior ? sumarDia(anterior.fecha) : restarDias(p.fecha, 7);
      hastaEfectivo = p.fecha;
    }
  }

  const fechasPartido = new Set(partidos.map((p) => p.fecha));
  let base: GpsRegistroConSesion[] = [];
  if (tipoEfectivo !== "partidos") {
    // "Entrenamientos" excluye los días de partido: ese día, un jugador que jugó tiene el
    // partido metido en su registro de esa fecha — mezclarlo acá inflaría el promedio de
    // entrenamiento con minutos de partido.
    let entrenamientos = registros.filter((r) => !fechasPartido.has(r.fecha));
    if (desdeEfectivo) entrenamientos = entrenamientos.filter((r) => r.fecha >= desdeEfectivo!);
    if (hastaEfectivo) entrenamientos = entrenamientos.filter((r) => r.fecha <= hastaEfectivo!);
    base = base.concat(entrenamientos);
  }
  if (tipoEfectivo !== "entrenamientos") {
    let partidosEnRango = partidosOrdenados;
    if (desdeEfectivo) partidosEnRango = partidosEnRango.filter((p) => p.fecha >= desdeEfectivo!);
    if (hastaEfectivo) partidosEnRango = partidosEnRango.filter((p) => p.fecha <= hastaEfectivo!);
    base = base.concat(await obtenerCargaPartidosComoRegistros(supabase, partidosEnRango));
  }

  const porJugador = agruparPorJugador(base);
  const jugadores = seleccionados.filter((n) => porJugador.has(n)).slice(0, 4);

  // El radar normaliza contra el mejor promedio de TODO el plantel con datos en este filtro, no
  // solo entre los jugadores elegidos — si no, apenas uno de los elegidos gane casi todo, el
  // radar colapsa a 100 en cada eje y deja de servir para comparar.
  const datosGrafico = METRICAS.filter((m) => m.clave !== "duracionMin").map((def) => {
    const promediosPlantel = Array.from(porJugador.values()).map((regs) => promedioSimple(regs, def.clave) ?? 0);
    const fila: { metrica: string; unidad: string; maxPlantel: number; [j: string]: string | number } = {
      metrica: def.corto,
      unidad: def.unidad,
      maxPlantel: Math.max(0, ...promediosPlantel),
    };
    for (const j of jugadores) fila[j] = promedioSimple(porJugador.get(j) ?? [], def.clave) ?? 0;
    return fila;
  });

  return (
    <div>
      <form method="get" className="mb-6 rounded-xl border border-border bg-surface p-4 shadow-sm">
        <input type="hidden" name="vista" value="jugadores" />
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Elegí hasta 4 jugadores</p>
        <div className="mb-4 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {nombresDisponibles.map((n) => (
            <label
              key={n}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground/70 transition-colors has-checked:border-primary has-checked:bg-primary/5 has-checked:text-primary"
            >
              <input type="checkbox" name="jugadores" value={n} defaultChecked={seleccionados.includes(n)} className="accent-primary" />
              {formatearNombreJugador(n)}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Tipo de carga</label>
            <CampoSelect name="tipo" defaultValue={tipoEfectivo}>
              {OPCIONES_TIPO.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.label}
                </option>
              ))}
            </CampoSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Desde</label>
            <input type="date" name="desde" defaultValue={desde} className={CAMPO_FECHA_CLASE} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Hasta</label>
            <input type="date" name="hasta" defaultValue={hasta} className={CAMPO_FECHA_CLASE} />
          </div>
          <div className="hidden h-10 w-px bg-border sm:block" />
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Microciclo de partido</label>
            <CampoSelect name="partido" defaultValue={partidoId ?? ""} className="min-w-[13rem]">
              <option value="">(elegir fechas a mano)</option>
              {partidosOrdenados.map((p) => (
                <option key={p.id} value={p.id}>
                  {new Date(`${p.fecha}T00:00:00`).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" })} vs {p.rival}
                </option>
              ))}
            </CampoSelect>
          </div>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark">
            Comparar
          </button>
        </div>
      </form>

      {jugadores.length === 0 ? (
        <p className="text-sm text-foreground/50">
          {seleccionados.length === 0 ? "Elegí al menos un jugador para comparar." : "Ninguno de los jugadores elegidos tiene datos en este filtro."}
        </p>
      ) : (
        <>
          <div className="mb-6 rounded-xl border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold text-foreground">Comparación visual</h3>
            <p className="mb-3 text-xs text-foreground/40">
              Promedio por sesión (no un acumulado). Cada eje es % del mejor promedio de todo el plantel en esa métrica (no solo entre los elegidos) — pasá el mouse para ver el número real.
            </p>
            <GraficoCompararJugadores datos={datosGrafico} jugadores={jugadores} />
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-primary/5 text-xs uppercase tracking-wide text-foreground/50">
                <tr>
                  <th className="px-3 py-2 text-left">Métrica (promedio por sesión)</th>
                  {jugadores.map((j) => (
                    <th key={j} className="px-3 py-2 text-right">
                      {formatearNombreJugador(j)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {METRICAS.filter((m) => m.clave !== "duracionMin").map((def) => (
                  <tr key={def.clave}>
                    <td className="px-3 py-2 font-medium text-foreground">
                      {def.label} {def.unidad && <span className="text-foreground/40">({def.unidad})</span>}
                    </td>
                    {jugadores.map((j) => (
                      <td key={j} className="px-3 py-2 text-right tabular-nums">
                        {(promedioSimple(porJugador.get(j) ?? [], def.clave) ?? 0).toLocaleString("es-UY")}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="px-3 py-2 font-medium text-foreground/50">Sesiones consideradas</td>
                  {jugadores.map((j) => (
                    <td key={j} className="px-3 py-2 text-right tabular-nums text-foreground/50">
                      {(porJugador.get(j) ?? []).length}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function VistaPropio({
  nombresDisponibles,
  porJugador,
  jugador,
  periodoA,
  periodoB,
}: {
  nombresDisponibles: string[];
  porJugador: Map<string, GpsRegistroConSesion[]>;
  jugador?: string;
  periodoA?: string;
  periodoB?: string;
}) {
  const registrosJugador = jugador ? (porJugador.get(jugador) ?? []) : [];
  const claveA = periodoA ?? "ultimas5";
  const claveB = periodoB ?? "todo";
  const regA = resolverPeriodoJugador(registrosJugador, claveA);
  const regB = resolverPeriodoJugador(registrosJugador, claveB);
  const comparacion = jugador && regA.length > 0 ? compararPeriodos(regA, regB.length > 0 ? regB : null) : null;
  const labelB = PERIODOS_JUGADOR.find((p) => p.clave === claveB)?.label ?? claveB;
  const contextoComparacion = comparacion?.anterior ? `vs. ${labelB} (${regB.length} sesión${regB.length === 1 ? "" : "es"})` : undefined;

  return (
    <div>
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
        <input type="hidden" name="vista" value="propio" />
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Jugador</label>
          <CampoSelect name="jugador" defaultValue={jugador ?? ""} className="min-w-[11rem]">
            <option value="">Elegir…</option>
            {nombresDisponibles.map((n) => (
              <option key={n} value={n}>
                {formatearNombreJugador(n)}
              </option>
            ))}
          </CampoSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Período A</label>
          <CampoSelect name="periodoA" defaultValue={claveA}>
            {PERIODOS_JUGADOR.map((p) => (
              <option key={p.clave} value={p.clave}>
                {p.label}
              </option>
            ))}
          </CampoSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Período B (referencia)</label>
          <CampoSelect name="periodoB" defaultValue={claveB}>
            {PERIODOS_JUGADOR.map((p) => (
              <option key={p.clave} value={p.clave}>
                {p.label}
              </option>
            ))}
          </CampoSelect>
        </div>
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark">
          Comparar
        </button>
      </form>

      {!jugador ? (
        <p className="text-sm text-foreground/50">Elegí un jugador para comparar sus propios períodos.</p>
      ) : !comparacion || regA.length === 0 ? (
        <p className="text-sm text-foreground/50">No hay sesiones de {jugador} en el Período A elegido.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard
            label="Distancia"
            valor={`${(comparacion.actual.distanciaTotalM ?? 0).toLocaleString("es-UY")} m`}
            cambioPct={comparacion.anterior ? comparacion.cambioPct.distanciaTotalM : undefined}
            contexto={contextoComparacion}
          />
          <KpiCard
            label="HSR"
            valor={`${(comparacion.actual.distAltaVelocidadM ?? 0).toLocaleString("es-UY")} m`}
            cambioPct={comparacion.anterior ? comparacion.cambioPct.distAltaVelocidadM : undefined}
            contexto={contextoComparacion}
          />
          <KpiCard
            label="Sprint"
            valor={`${(comparacion.actual.distMuyAltaVelocidadM ?? 0).toLocaleString("es-UY")} m`}
            cambioPct={comparacion.anterior ? comparacion.cambioPct.distMuyAltaVelocidadM : undefined}
            contexto={contextoComparacion}
          />
          <KpiCard
            label="Vel. máxima"
            valor={`${(comparacion.actual.velocidadMaximaKmh ?? 0).toLocaleString("es-UY")} km/h`}
            cambioPct={comparacion.anterior ? comparacion.cambioPct.velocidadMaximaKmh : undefined}
            contexto={contextoComparacion}
          />
          <KpiCard label="Sesiones en A" valor={regA.length.toLocaleString("es-UY")} />
        </div>
      )}
    </div>
  );
}
