"use client";

import Image from "next/image";
import { useState } from "react";
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
  altura: number | null;
};

const CATEGORY_ORDER: Category[] = [
  "Portero",
  "Defensor",
  "Mediocampista",
  "Delantero",
];

const CATEGORY_LABEL: Record<Category, string> = {
  Portero: "Porteros",
  Defensor: "Defensores",
  Mediocampista: "Mediocampistas",
  Delantero: "Delanteros",
};

function dragPayload(playerId: string) {
  return JSON.stringify({ playerId });
}

function readDragPayload(e: React.DragEvent): string | null {
  try {
    const { playerId } = JSON.parse(e.dataTransfer.getData("text/plain"));
    return playerId ?? null;
  } catch {
    return null;
  }
}

function PlayerAvatar({ player, size }: { player: Player; size: number }) {
  if (player.foto_url) {
    return (
      <Image
        src={player.foto_url}
        alt={`${player.nombre} ${player.apellido}`}
        width={size}
        height={size}
        draggable={false}
        className="pointer-events-none rounded-full object-cover ring-2 ring-white/80 select-none"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="pointer-events-none flex items-center justify-center rounded-full bg-primary/80 font-semibold text-white ring-2 ring-white/80 select-none"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials(player.nombre, player.apellido)}
    </div>
  );
}

export function TacticalBoard({ players }: { players: Player[] }) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  const playersById = new Map(players.map((p) => [p.id, p]));
  const placedIds = new Set(Object.keys(positions));

  function handlePitchDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const playerId = readDragPayload(e);
    if (!playerId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(96, Math.max(4, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(96, Math.max(4, ((e.clientY - rect.top) / rect.height) * 100));

    setPositions((prev) => ({ ...prev, [playerId]: { x, y } }));
  }

  function handleRosterDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const playerId = readDragPayload(e);
    if (!playerId) return;

    setPositions((prev) => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
  }

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    players: players
      .filter((p) => (p.posicion_principal ?? "Delantero") === category)
      .sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999)),
  })).filter((group) => group.players.length > 0);

  return (
    <div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handlePitchDrop}
        className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-lg shadow-sm"
        style={{
          aspectRatio: "2 / 3",
          background:
            "repeating-linear-gradient(180deg, #2f8f4e 0, #2f8f4e 10%, #33995284 10%, #339952 20%)",
        }}
      >
        <PitchSvg />

        <Image
          src="/escudo-nacional.png"
          alt=""
          width={200}
          height={200}
          draggable={false}
          className="pointer-events-none absolute top-1/2 left-1/2 w-[55%] -translate-x-1/2 -translate-y-1/2 opacity-[0.28] select-none"
        />

        {Object.entries(positions).map(([playerId, pos]) => {
          const player = playersById.get(playerId);
          if (!player) return null;

          return (
            <div
              key={playerId}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", dragPayload(playerId))}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center gap-1 active:cursor-grabbing"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <div className="relative">
                <PlayerAvatar player={player} size={34} />
                {player.dorsal && (
                  <span className="pointer-events-none absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white ring-1 ring-white">
                    {player.dorsal}
                  </span>
                )}
              </div>
              <span className="pointer-events-none max-w-[64px] truncate rounded bg-black/40 px-1 text-[10px] font-medium leading-tight text-white select-none">
                {player.apellido}
              </span>
            </div>
          );
        })}
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleRosterDrop}
        className="mt-8 space-y-6"
      >
        {grouped.map((group) => (
          <div key={group.category}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/60">
              {CATEGORY_LABEL[group.category]}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {group.players.map((player) => {
                const isPlaced = placedIds.has(player.id);
                return (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", dragPayload(player.id))
                    }
                    className={`flex cursor-grab flex-col items-center gap-2 rounded-lg border bg-surface p-3 text-center transition-colors active:cursor-grabbing ${
                      isPlaced ? "border-primary/40 bg-primary/5" : "border-border"
                    }`}
                  >
                    <PlayerAvatar player={player} size={48} />
                    <div>
                      <p className="text-sm font-medium leading-tight">
                        {player.nombre} {player.apellido}
                      </p>
                      <p className="mt-0.5 text-xs text-foreground/50">
                        {player.posicion_principal}
                        {player.dorsal ? ` · #${player.dorsal}` : ""}
                      </p>
                      <p className="text-xs text-foreground/50">
                        {player.altura ? `${player.altura.toFixed(2)} m` : "Altura s/d"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
