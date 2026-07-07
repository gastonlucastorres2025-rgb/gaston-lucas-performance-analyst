"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { PitchSvg } from "@/components/pitch-svg";
import { initials } from "@/lib/player-utils";

type Category = "Portero" | "Defensor" | "Mediocampista" | "Delantero";

type Player = {
  id: string;
  nombre: string;
  apellido: string;
  dorsal: number | null;
  posicion_principal: Category | null;
  foto_url: string | null;
};

type Slot = {
  id: string;
  label: string;
  category: Category;
  x: number;
  y: number;
};

const FORMATIONS: Record<string, Slot[]> = {
  "4-3-3": [
    { id: "gk", label: "POR", category: "Portero", x: 50, y: 90 },
    { id: "lb", label: "LI", category: "Defensor", x: 15, y: 72 },
    { id: "cb1", label: "DFC", category: "Defensor", x: 37, y: 77 },
    { id: "cb2", label: "DFC", category: "Defensor", x: 63, y: 77 },
    { id: "rb", label: "LD", category: "Defensor", x: 85, y: 72 },
    { id: "cm1", label: "MC", category: "Mediocampista", x: 28, y: 52 },
    { id: "cm2", label: "MC", category: "Mediocampista", x: 50, y: 56 },
    { id: "cm3", label: "MC", category: "Mediocampista", x: 72, y: 52 },
    { id: "lw", label: "EI", category: "Delantero", x: 18, y: 24 },
    { id: "st", label: "DC", category: "Delantero", x: 50, y: 16 },
    { id: "rw", label: "ED", category: "Delantero", x: 82, y: 24 },
  ],
  "4-2-3-1": [
    { id: "gk", label: "POR", category: "Portero", x: 50, y: 90 },
    { id: "lb", label: "LI", category: "Defensor", x: 15, y: 72 },
    { id: "cb1", label: "DFC", category: "Defensor", x: 37, y: 77 },
    { id: "cb2", label: "DFC", category: "Defensor", x: 63, y: 77 },
    { id: "rb", label: "LD", category: "Defensor", x: 85, y: 72 },
    { id: "dm1", label: "MCD", category: "Mediocampista", x: 36, y: 60 },
    { id: "dm2", label: "MCD", category: "Mediocampista", x: 64, y: 60 },
    { id: "lam", label: "MI", category: "Mediocampista", x: 18, y: 38 },
    { id: "cam", label: "MCO", category: "Mediocampista", x: 50, y: 34 },
    { id: "ram", label: "MD", category: "Mediocampista", x: 82, y: 38 },
    { id: "st", label: "DC", category: "Delantero", x: 50, y: 14 },
  ],
};

function autoFill(players: Player[], slots: Slot[]) {
  const byCategory = new Map<Category, Player[]>();
  for (const player of players) {
    const category = player.posicion_principal ?? "Delantero";
    const list = byCategory.get(category) ?? [];
    list.push(player);
    byCategory.set(category, list);
  }
  for (const list of byCategory.values()) {
    list.sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));
  }

  const assignments: Record<string, string | null> = {};
  const used = new Set<string>();

  for (const slot of slots) {
    const pool = byCategory.get(slot.category) ?? [];
    const candidate = pool.find((p) => !used.has(p.id));
    assignments[slot.id] = candidate?.id ?? null;
    if (candidate) used.add(candidate.id);
  }

  return assignments;
}

function dragPayload(playerId: string, fromSlotId: string | null) {
  return JSON.stringify({ playerId, fromSlotId });
}

function PlayerAvatar({
  player,
  size,
}: {
  player: Player;
  size: number;
}) {
  if (player.foto_url) {
    return (
      <Image
        src={player.foto_url}
        alt={`${player.nombre} ${player.apellido}`}
        width={size}
        height={size}
        className="rounded-full object-cover ring-2 ring-white/80"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-primary/80 font-semibold text-white ring-2 ring-white/80"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials(player.nombre, player.apellido)}
    </div>
  );
}

export function TacticalBoard({ players }: { players: Player[] }) {
  const [formationKey, setFormationKey] = useState<keyof typeof FORMATIONS>("4-3-3");
  const [appliedFormationKey, setAppliedFormationKey] = useState(formationKey);
  const [assignments, setAssignments] = useState<Record<string, string | null>>(() =>
    autoFill(players, FORMATIONS[formationKey]),
  );

  const slots = FORMATIONS[formationKey];

  if (formationKey !== appliedFormationKey) {
    setAppliedFormationKey(formationKey);
    setAssignments(autoFill(players, slots));
  }

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    for (const player of players) map.set(player.id, player);
    return map;
  }, [players]);

  const assignedIds = useMemo(
    () => new Set(Object.values(assignments).filter(Boolean) as string[]),
    [assignments],
  );

  const bench = useMemo(
    () =>
      players
        .filter((p) => !assignedIds.has(p.id))
        .sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999)),
    [players, assignedIds],
  );

  function handleDropOnSlot(e: React.DragEvent, slotId: string) {
    e.preventDefault();
    const { playerId, fromSlotId } = JSON.parse(
      e.dataTransfer.getData("text/plain"),
    ) as { playerId: string; fromSlotId: string | null };

    setAssignments((prev) => {
      const next = { ...prev };
      const displaced = next[slotId] ?? null;
      next[slotId] = playerId;
      if (fromSlotId) {
        next[fromSlotId] = displaced;
      }
      return next;
    });
  }

  function handleDropOnBench(e: React.DragEvent) {
    e.preventDefault();
    const { fromSlotId } = JSON.parse(e.dataTransfer.getData("text/plain")) as {
      playerId: string;
      fromSlotId: string | null;
    };
    if (!fromSlotId) return;
    setAssignments((prev) => ({ ...prev, [fromSlotId]: null }));
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1">
        <div className="mb-4 flex gap-2">
          {Object.keys(FORMATIONS).map((key) => (
            <button
              key={key}
              onClick={() => setFormationKey(key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                formationKey === key
                  ? "bg-primary text-white"
                  : "border border-border bg-surface text-foreground/70 hover:bg-primary/5"
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <div
          className="relative mx-auto w-full max-w-xl overflow-hidden rounded-lg shadow-sm"
          style={{
            aspectRatio: "2 / 3",
            background:
              "repeating-linear-gradient(180deg, #2f8f4e 0, #2f8f4e 10%, #33995284 10%, #339952 20%)",
          }}
        >
          <PitchSvg />

          {slots.map((slot) => {
            const player = assignments[slot.id]
              ? playersById.get(assignments[slot.id] as string)
              : null;

            return (
              <div
                key={slot.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnSlot(e, slot.id)}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              >
                {player ? (
                  <div
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData(
                        "text/plain",
                        dragPayload(player.id, slot.id),
                      )
                    }
                    className="flex cursor-grab flex-col items-center active:cursor-grabbing"
                  >
                    <div className="relative">
                      <PlayerAvatar player={player} size={40} />
                      {player.dorsal && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white ring-1 ring-white">
                          {player.dorsal}
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 max-w-[70px] truncate rounded bg-black/40 px-1 text-[10px] font-medium leading-tight text-white">
                      {player.apellido}
                    </span>
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-white/60 text-[9px] font-medium text-white/70">
                    {slot.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <aside className="w-full shrink-0 lg:w-60">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          Plantel disponible
        </h3>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropOnBench}
          className="flex max-h-[600px] flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-surface p-2"
        >
          {bench.length === 0 && (
            <p className="p-2 text-sm text-foreground/50">
              Todos los jugadores están en cancha.
            </p>
          )}
          {bench.map((player) => (
            <div
              key={player.id}
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData("text/plain", dragPayload(player.id, null))
              }
              className="flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 hover:bg-primary/5 active:cursor-grabbing"
            >
              <PlayerAvatar player={player} size={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {player.nombre} {player.apellido}
                </p>
                <p className="text-xs text-foreground/50">
                  {player.posicion_principal}
                  {player.dorsal ? ` · #${player.dorsal}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
