"use client";

import { pdf } from "@react-pdf/renderer";
import { useEffect, useRef, useState } from "react";
import { OpponentReportPdfDocument } from "@/components/statsbomb/opponent-report-pdf";
import { generarInformeRival } from "@/lib/statsbomb-actions";
import {
  NOTAS_TACTICAS_DEF,
  imagenesVacias,
  linksVacios,
  notasVacias,
  type NotaTacticaDef,
  type NotaTacticaId,
  type NotasTacticas,
  type NotasTacticasImagenes,
  type NotasTacticasLinks,
} from "@/lib/statsbomb/notas-tacticas";
import { eliminarImagenNotaTactica, subirImagenNotaTactica } from "@/lib/statsbomb/notas-tacticas-actions";
import type { OpponentReportData } from "@/lib/statsbomb/report-data";

const GRUPOS_NOTAS: { fase: NotaTacticaDef["fase"]; titulo: string }[] = [
  { fase: "identidad", titulo: "Identidad general" },
  { fase: "ofensiva", titulo: "Fase ofensiva" },
  { fase: "defensiva", titulo: "Fase defensiva" },
  { fase: "transiciones", titulo: "Transiciones" },
];

const DRAFT_KEY = "statsbomb-informe-notas-draft";
type Draft = { rivalNombre: string; notas: NotasTacticas; imagenes: NotasTacticasImagenes; links?: NotasTacticasLinks };

export function GenerarInformeForm() {
  const [rivalNombre, setRivalNombre] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OpponentReportData | null>(null);
  const [notas, setNotas] = useState<NotasTacticas>(notasVacias());
  const [imagenes, setImagenes] = useState<NotasTacticasImagenes>(imagenesVacias());
  const [links, setLinks] = useState<NotasTacticasLinks>(linksVacios());
  const [imagenPendiente, setImagenPendiente] = useState<NotaTacticaId | null>(null);
  const [imagenError, setImagenError] = useState<Partial<Record<NotaTacticaId, string>>>({});
  const [linkError, setLinkError] = useState<Partial<Record<NotaTacticaId, string>>>({});
  // Rival al que corresponde un borrador restaurado desde el navegador — si coincide con lo que
  // se tipeó, "Generar informe" no pisa las notas restauradas con notas vacías.
  const [notasGuardadasPara, setNotasGuardadasPara] = useState<string | null>(null);

  // Restaura el borrador (rival + notas + imágenes) guardado en el navegador, para no perder lo
  // tipeado si la página se refresca (ej. tras un error o para aplicar un fix). Tiene que ir en un
  // efecto: localStorage no existe en el render de servidor, así que no se puede leer en la
  // inicialización del estado sin romper la hidratación.
  useEffect(() => {
    const guardado = localStorage.getItem(DRAFT_KEY);
    if (!guardado) return;
    try {
      const draft: Draft = JSON.parse(guardado);
      /* eslint-disable react-hooks/set-state-in-effect -- restaura un borrador desde localStorage
         (fuente externa al render), no hay forma de hacerlo fuera de un efecto. */
      setRivalNombre(draft.rivalNombre);
      setNotas(draft.notas);
      setImagenes(draft.imagenes ?? imagenesVacias());
      setLinks(draft.links ?? linksVacios());
      setNotasGuardadasPara(draft.rivalNombre.trim().toLowerCase());
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // Borrador corrupto: se ignora.
    }
  }, []);

  useEffect(() => {
    if (!rivalNombre.trim() && Object.keys(notas).length === 0 && Object.keys(imagenes).length === 0 && Object.keys(links).length === 0)
      return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ rivalNombre, notas, imagenes, links } satisfies Draft));
  }, [rivalNombre, notas, imagenes, links]);

  async function handleGenerar() {
    if (!rivalNombre.trim()) return;
    setPending(true);
    setError(null);
    setData(null);
    if (notasGuardadasPara !== rivalNombre.trim().toLowerCase()) {
      setNotas(notasVacias());
      setImagenes(imagenesVacias());
      setLinks(linksVacios());
    }
    try {
      const res = await generarInformeRival(rivalNombre.trim());
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setData(res.data);
    } finally {
      setPending(false);
    }
  }

  async function handleSubirImagen(notaId: NotaTacticaId, file: File) {
    setImagenPendiente(notaId);
    setImagenError((prev) => ({ ...prev, [notaId]: undefined }));
    const formData = new FormData();
    formData.set("file", file);
    const result = await subirImagenNotaTactica(notaId, formData);
    if (result.url) {
      setImagenes((prev) => ({ ...prev, [notaId]: [...(prev[notaId] ?? []), result.url!] }));
    } else {
      setImagenError((prev) => ({ ...prev, [notaId]: result.error ?? "No se pudo subir la imagen." }));
    }
    setImagenPendiente(null);
  }

  async function handleQuitarImagen(notaId: NotaTacticaId, url: string) {
    setImagenes((prev) => ({ ...prev, [notaId]: (prev[notaId] ?? []).filter((u) => u !== url) }));
    await eliminarImagenNotaTactica(url);
  }

  function handleAgregarLink(notaId: NotaTacticaId, urlCruda: string) {
    const url = urlCruda.trim();
    setLinkError((prev) => ({ ...prev, [notaId]: undefined }));
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setLinkError((prev) => ({ ...prev, [notaId]: "El link tiene que empezar con http:// o https://" }));
      return;
    }
    setLinks((prev) => ({ ...prev, [notaId]: [...(prev[notaId] ?? []), url] }));
  }

  function handleQuitarLink(notaId: NotaTacticaId, url: string) {
    setLinks((prev) => ({ ...prev, [notaId]: (prev[notaId] ?? []).filter((u) => u !== url) }));
  }

  async function handleDescargar() {
    if (!data) return;
    const crestUrl = `${window.location.origin}/escudo-nacional.png`;
    const blob = await pdf(
      <OpponentReportPdfDocument
        data={data}
        nuestroCrestUrl={crestUrl}
        notasTacticas={notas}
        notasTacticasImagenes={imagenes}
        notasTacticasLinks={links}
      />,
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Informe_Rival_${data.rival.nombre.replace(/\s+/g, "_")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex gap-2">
        <input
          type="text"
          value={rivalNombre}
          onChange={(e) => setRivalNombre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGenerar()}
          placeholder="Nombre del rival (ej: Montevideo Wanderers)"
          className="flex-1 rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <button
          onClick={handleGenerar}
          disabled={pending || !rivalNombre.trim()}
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {pending ? "Generando..." : "Generar informe"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-accent">{error}</p>}

      {data && (
        <div className="mt-5 rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground">
            Informe listo: {data.rival.nombre}
            {data.proximoPartido && ` · próximo partido ${data.proximoPartido.fecha}`}
          </p>
          <p className="mt-1 text-xs text-foreground/50">
            Muestra: últimos {data.muestraRival.length} partidos de {data.rival.nombre} · {data.metricas.length} indicadores
            comparados
            {data.jugadoresClaveRival.length > 0 && ` · ${data.jugadoresClaveRival.length} jugadores clave detectados`}.
          </p>

          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">Notas tácticas (opcional)</p>
            <p className="mt-1 text-xs text-foreground/50">
              Patrones observados por el cuerpo técnico — se agregan al PDF debajo de la fase correspondiente. No hace falta
              completar todas.
            </p>
            <div className="mt-3 space-y-4">
              {GRUPOS_NOTAS.map((grupo) => (
                <div key={grupo.fase}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">{grupo.titulo}</p>
                  <div className="mt-2 space-y-2">
                    {NOTAS_TACTICAS_DEF.filter((def) => def.fase === grupo.fase).map((def) => (
                      <div key={def.id}>
                        <label className="text-xs text-foreground/70">{def.label}</label>
                        <textarea
                          value={notas[def.id] ?? ""}
                          onChange={(e) => setNotas((prev) => ({ ...prev, [def.id]: e.target.value }))}
                          placeholder={def.placeholder}
                          rows={2}
                          className="mt-1 w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                        <NotaImagenes
                          notaId={def.id}
                          urls={imagenes[def.id] ?? []}
                          subiendo={imagenPendiente === def.id}
                          error={imagenError[def.id]}
                          onSubir={handleSubirImagen}
                          onQuitar={handleQuitarImagen}
                        />
                        <NotaLinks
                          notaId={def.id}
                          urls={links[def.id] ?? []}
                          error={linkError[def.id]}
                          onAgregar={handleAgregarLink}
                          onQuitar={handleQuitarLink}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleDescargar}
            className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            ⬇ Descargar informe PDF
          </button>
        </div>
      )}
    </div>
  );
}

function NotaImagenes({
  notaId,
  urls,
  subiendo,
  error,
  onSubir,
  onQuitar,
}: {
  notaId: NotaTacticaId;
  urls: string[];
  subiendo: boolean;
  error: string | undefined;
  onSubir: (notaId: NotaTacticaId, file: File) => void;
  onQuitar: (notaId: NotaTacticaId, url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-1.5">
      {urls.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-2">
          {urls.map((url) => (
            <div key={url} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-16 w-16 rounded border border-border object-cover" />
              <button
                type="button"
                onClick={() => onQuitar(notaId, url)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                title="Quitar imagen"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          files.forEach((file) => onSubir(notaId, file));
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={subiendo}
        className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/60 transition-colors hover:bg-primary/5 disabled:opacity-50"
      >
        {subiendo ? "Subiendo..." : "+ Agregar imagen"}
      </button>
      {error && <p className="mt-1 text-xs text-accent">{error}</p>}
    </div>
  );
}

/** Enlaces a video (opcional, más de uno por nota) — en el PDF aparecen como tarjeta clickeable (escudo del rival
 * + nombre de la nota) que lleva directo al video, no como texto plano. */
function NotaLinks({
  notaId,
  urls,
  error,
  onAgregar,
  onQuitar,
}: {
  notaId: NotaTacticaId;
  urls: string[];
  error: string | undefined;
  onAgregar: (notaId: NotaTacticaId, url: string) => void;
  onQuitar: (notaId: NotaTacticaId, url: string) => void;
}) {
  const [valor, setValor] = useState("");

  function agregar(urlOverride?: string) {
    onAgregar(notaId, urlOverride ?? valor);
    setValor("");
  }

  return (
    <div className="mt-1.5">
      {urls.length > 0 && (
        <div className="mb-1.5 space-y-1">
          {urls.map((url) => (
            <div key={url} className="flex items-center gap-2 rounded border border-border px-2 py-1">
              <span className="truncate text-xs text-foreground/70">🎬 {url}</span>
              <button
                type="button"
                onClick={() => onQuitar(notaId, url)}
                className="ml-auto shrink-0 text-xs text-foreground/40 hover:text-accent"
                title="Quitar link"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <input
          type="url"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregar())}
          // Pegar el link ya lo agrega solo — no hace falta tocar el botón (pedido explícito del usuario:
          // paste → se agrega solo, sin pasos extra).
          onPaste={(e) => {
            const pegado = e.clipboardData.getData("text").trim();
            if (/^https?:\/\//i.test(pegado)) {
              e.preventDefault();
              agregar(pegado);
            }
          }}
          placeholder="https://... (link al video)"
          className="flex-1 rounded border border-border px-2 py-1 text-xs focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={() => agregar()}
          disabled={!valor.trim()}
          className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/60 transition-colors hover:bg-primary/5 disabled:opacity-50"
        >
          + Agregar link
        </button>
      </div>
      <p className="mt-1 text-[10px] text-foreground/40">
        Pegá el link y se agrega solo — si lo escribís a mano, tocá &quot;+ Agregar link&quot; o Enter para guardarlo.
      </p>
      {error && <p className="mt-1 text-xs text-accent">{error}</p>}
    </div>
  );
}
