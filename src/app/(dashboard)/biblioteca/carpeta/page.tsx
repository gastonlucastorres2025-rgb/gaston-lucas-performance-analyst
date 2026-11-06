import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { BibliotecaLista } from "@/components/biblioteca/biblioteca-lista";
import { carpetaPorNombre, listarVideos } from "@/lib/biblioteca/carpeta";
import { claveVideo, listarMetadata } from "@/lib/biblioteca/datos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BibliotecaCarpetaPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const carpeta = carpetaPorNombre(c);
  if (!carpeta) notFound();

  const supabase = await createClient();
  const metadata = await listarMetadata(supabase);
  const videos = listarVideos(carpeta).map((v) => {
    const m = metadata.get(claveVideo(carpeta.nombre, v.archivo));
    return { ...v, titulo: m?.titulo ?? "", etiquetas: m?.etiquetas ?? [] };
  });

  return (
    <div>
      <div className="mb-2 text-sm text-foreground/60">
        <Link href="/biblioteca" className="hover:text-primary">
          Biblioteca
        </Link>{" "}
        / {carpeta.nombre}
      </div>
      <PageHeader title={carpeta.nombre} description={`${videos.length} videos`} />
      <BibliotecaLista carpeta={carpeta.nombre} videos={videos} />
    </div>
  );
}
