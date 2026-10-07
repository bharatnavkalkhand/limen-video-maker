import { avatarSrc, hasHost } from "@/lib/video/avatars";
import type { AspectId, AvatarMode } from "@/lib/video/types";
import { cn } from "@/lib/utils";

export function HostOverlay({
  avatarId,
  customUrl,
  mode,
  aspect,
  energy,
  speaking,
}: {
  avatarId: string;
  customUrl?: string;
  mode: AvatarMode;
  aspect: AspectId;
  energy: number;
  speaking: boolean;
}) {
  const src = avatarSrc(avatarId, customUrl);
  if (!hasHost(avatarId, customUrl) || !src) return null;

  const tall = aspect === "9:16";
  const host = mode === "host";
  const scale = 1 + energy * 0.04;
  const jaw = energy * 2.2;

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-3 z-10",
        tall ? "bottom-32" : "bottom-28 md:bottom-32",
      )}
      style={{ transform: `scale(${scale})`, transformOrigin: "left bottom" }}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-md bg-elevated shadow-[var(--shadow-border)] ring-1 ring-accent/40",
          host
            ? tall
              ? "h-40 w-28"
              : "h-48 w-36 md:h-56 md:w-40"
            : tall
              ? "h-28 w-20"
              : "h-32 w-24 md:h-40 md:w-28",
        )}
        style={{
          boxShadow: speaking
            ? `0 0 ${10 + energy * 22}px color-mix(in oklab, var(--color-accent) ${Math.round(18 + energy * 30)}%, transparent)`
            : undefined,
        }}
      >
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover object-top"
          style={{ transform: `translateY(${jaw}%)` }}
        />
        <div
          className="absolute bottom-2 right-2 flex h-4 items-end gap-px"
          aria-hidden
        >
          {[0, 1, 2, 3].map((i) => {
            const amp = speaking ? 0.28 + energy * (0.5 + i * 0.12) : 0.2;
            return (
              <span
                key={i}
                className="w-0.5 rounded-full bg-fg"
                style={{ height: `${Math.round(amp * 16)}px` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
