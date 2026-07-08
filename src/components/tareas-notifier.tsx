"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";

const POLL_MS = 30_000;
const GRACE_MS = 15 * 60_000;

function subscribeNoop() {
  return () => {};
}

function getClientPermission(): NotificationPermission | "unsupported" {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

function getServerPermission(): NotificationPermission | "unsupported" {
  return "unsupported";
}

export function TareasNotifier() {
  const detectedPermission = useSyncExternalStore(subscribeNoop, getClientPermission, getServerPermission);
  const [override, setOverride] = useState<NotificationPermission | null>(null);
  const permission = override ?? detectedPermission;

  useEffect(() => {
    if (permission !== "granted") return;

    const supabase = createClient();

    async function checkTareas() {
      const { data: tareas } = await supabase
        .from("tareas")
        .select("id, titulo, descripcion, fecha, hora")
        .eq("completada", false)
        .eq("notificado", false);

      if (!tareas?.length) return;

      const now = Date.now();
      for (const tarea of tareas) {
        const dt = new Date(`${tarea.fecha}T${tarea.hora}`).getTime();
        if (dt <= now && now - dt <= GRACE_MS) {
          new Notification(tarea.titulo, {
            body: tarea.descripcion || `Tarea programada para hoy a las ${tarea.hora.slice(0, 5)}`,
            icon: "/escudo-nacional.png",
          });
          await supabase.from("tareas").update({ notificado: true }).eq("id", tarea.id);
        }
      }
    }

    checkTareas();
    const interval = setInterval(checkTareas, POLL_MS);
    return () => clearInterval(interval);
  }, [permission]);

  if (permission !== "default") return null;

  return (
    <button
      onClick={() => Notification.requestPermission().then(setOverride)}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground/70 shadow-md transition-colors hover:bg-primary/5"
    >
      🔔 Activar avisos de tareas
    </button>
  );
}
