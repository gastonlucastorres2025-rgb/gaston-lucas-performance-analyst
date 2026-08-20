import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ESTADO_LABEL: Record<string, string> = {
  detectado: "Detectado",
  primera_observacion: "Primera observación",
  en_seguimiento: "En seguimiento",
  seguimiento_prioritario: "Seguimiento prioritario",
  requiere_nueva_observacion: "Requiere nueva observación",
  perfil_consolidado: "Perfil consolidado",
  pausado: "Pausado",
  descartado: "Descartado",
  archivado: "Archivado",
};

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/50">{titulo}</h2>
      {children}
    </div>
  );
}

function fechaCorta(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" });
}

export default async function SeguimientoInternacionalPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: jugador } = await supabase.from("si_jugadores").select("*").eq("id", id).maybeSingle();
  if (!jugador) notFound();

  const [{ data: observaciones }, { data: cambios }] = await Promise.all([
    supabase
      .from("si_observaciones")
      .select("id, observation_date, tactical_text, technical_text, physical_text, general_summary, club_at_time, competition, shirt_number_at_time, source_document_id, confidence_score, created_at")
      .eq("player_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("si_cambios_historial").select("campo, valor_anterior, valor_nuevo, origen, created_at").eq("player_id", id).order("created_at", { ascending: false }),
  ]);

  const documentoIds = [...new Set((observaciones ?? []).map((o) => o.source_document_id).filter(Boolean))] as string[];
  const { data: documentos } =
    documentoIds.length > 0
      ? await supabase.from("si_documentos_fuente").select("id, file_name, file_type, drive_url").in("id", documentoIds)
      : { data: [] };
  const documentosPorId = new Map((documentos ?? []).map((d) => [d.id, d]));

  const textosNoVacios = (campo: "tactical_text" | "technical_text" | "physical_text") =>
    (observaciones ?? []).map((o) => o[campo]).filter((t): t is string => Boolean(t && t.trim()));

  return (
    <div>
      <div className="mb-6 flex items-center gap-4 border-b border-border pb-4">
        {jugador.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={jugador.photo_url}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="h-16 w-16 shrink-0 rounded-full border border-border bg-surface" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{jugador.full_name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground/60">
            {jugador.club_escudo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={jugador.club_escudo_url} alt="" width={16} height={16} className="h-4 w-4 object-contain" />
            )}
            {jugador.current_club ?? "Club sin datos"} · {jugador.primary_position ?? "Posición sin datos"}
          </p>
        </div>
        {jugador.transfermarkt_url && (
          <Link
            href={jugador.transfermarkt_url}
            target="_blank"
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-primary/5 hover:text-primary"
          >
            Ver en Transfermarkt
          </Link>
        )}
      </div>

      <Seccion titulo="Resumen">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <div className="text-xs text-foreground/50">Club actual</div>
            <div className="flex items-center gap-1.5 font-medium">
              {jugador.club_escudo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={jugador.club_escudo_url} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
              )}
              {jugador.current_club ?? "s/d"}
            </div>
          </div>
          <div>
            <div className="text-xs text-foreground/50">Posición</div>
            <div className="font-medium">
              {jugador.primary_position ?? "s/d"}
              {jugador.secondary_positions?.length > 0 ? ` (${jugador.secondary_positions.join(", ")})` : ""}
            </div>
          </div>
          <div>
            <div className="text-xs text-foreground/50">Altura</div>
            <div className="font-medium">{jugador.height ? `${jugador.height} cm` : "s/d"}</div>
          </div>
          <div>
            <div className="text-xs text-foreground/50">Pie hábil</div>
            <div className="font-medium capitalize">{jugador.preferred_foot ?? "s/d"}</div>
          </div>
          <div>
            <div className="text-xs text-foreground/50">Nacionalidad</div>
            <div className="font-medium">{jugador.nationality ?? "s/d"}</div>
          </div>
          <div>
            <div className="text-xs text-foreground/50">Estado de seguimiento</div>
            <div className="font-medium">{ESTADO_LABEL[jugador.tracking_status] ?? jugador.tracking_status}</div>
          </div>
          <div>
            <div className="text-xs text-foreground/50">Análisis registrados</div>
            <div className="font-medium">{observaciones?.length ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-foreground/50">Última actualización</div>
            <div className="font-medium">{fechaCorta(jugador.updated_at)}</div>
          </div>
        </div>
        {jugador.profile_state !== "completo" && (
          <p className="mt-3 rounded-md bg-accent/10 px-3 py-2 text-xs text-accent">
            {jugador.profile_state === "pendiente_revision"
              ? "Este perfil quedó marcado para revisión: pudo haberse creado en vez de asociarse a un jugador ya existente. Revisar en la bandeja de revisión."
              : "Perfil incompleto: todavía no tiene todos los datos generales cargados."}
          </p>
        )}
      </Seccion>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Seccion titulo="Táctica">
          {textosNoVacios("tactical_text").length > 0 ? (
            <ul className="flex flex-col gap-2 text-sm text-foreground/80">
              {textosNoVacios("tactical_text").map((t, i) => (
                <li key={i} className="border-b border-border pb-2 last:border-b-0">
                  {t}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground/40">Sin observaciones tácticas.</p>
          )}
        </Seccion>
        <Seccion titulo="Técnica">
          {textosNoVacios("technical_text").length > 0 ? (
            <ul className="flex flex-col gap-2 text-sm text-foreground/80">
              {textosNoVacios("technical_text").map((t, i) => (
                <li key={i} className="border-b border-border pb-2 last:border-b-0">
                  {t}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground/40">Sin observaciones técnicas.</p>
          )}
        </Seccion>
        <Seccion titulo="Física">
          {textosNoVacios("physical_text").length > 0 ? (
            <ul className="flex flex-col gap-2 text-sm text-foreground/80">
              {textosNoVacios("physical_text").map((t, i) => (
                <li key={i} className="border-b border-border pb-2 last:border-b-0">
                  {t}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground/40">Sin observaciones físicas.</p>
          )}
        </Seccion>
      </div>

      <Seccion titulo="Historial de análisis">
        {observaciones && observaciones.length > 0 ? (
          <div className="flex flex-col divide-y divide-border">
            {observaciones.map((o) => {
              const doc = o.source_document_id ? documentosPorId.get(o.source_document_id) : null;
              return (
                <div key={o.id} className="py-3 text-sm">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-foreground/50">
                    <span>{fechaCorta(o.created_at)}</span>
                    {o.club_at_time && <span>· {o.club_at_time}</span>}
                    {o.competition && <span>· {o.competition}</span>}
                    {o.shirt_number_at_time && <span>· dorsal usado: {o.shirt_number_at_time}</span>}
                    {doc && (
                      <span>
                        ·{" "}
                        {doc.drive_url ? (
                          <Link href={doc.drive_url} target="_blank" className="text-primary hover:underline">
                            {doc.file_name}
                          </Link>
                        ) : (
                          doc.file_name
                        )}
                      </span>
                    )}
                  </div>
                  {o.general_summary && <p className="text-foreground/70">{o.general_summary}</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-foreground/40">Sin análisis registrados.</p>
        )}
      </Seccion>

      {documentos && documentos.length > 0 && (
        <Seccion titulo="Documentos originales">
          <div className="flex flex-col gap-2 text-sm">
            {documentos.map((d) => (
              <div key={d.id} className="flex items-center justify-between">
                <span>{d.file_name}</span>
                {d.drive_url && (
                  <Link href={d.drive_url} target="_blank" className="text-primary hover:underline">
                    Ver en Drive
                  </Link>
                )}
              </div>
            ))}
          </div>
        </Seccion>
      )}

      {cambios && cambios.length > 0 && (
        <Seccion titulo="Historial de cambios">
          <div className="flex flex-col divide-y divide-border text-sm">
            {cambios.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <span className="text-foreground/70">
                  <strong>{c.campo}</strong>: {c.valor_anterior ?? "—"} → {c.valor_nuevo}
                </span>
                <span className="text-xs text-foreground/40">
                  {fechaCorta(c.created_at)} · {c.origen}
                </span>
              </div>
            ))}
          </div>
        </Seccion>
      )}
    </div>
  );
}
