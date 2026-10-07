import { useEffect, useRef, useState, type ReactNode } from "react";
import { ImagePlus, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AVATAR_MODES,
  AVATARS,
  CUSTOM_AVATAR_ID,
  NONE_AVATAR_ID,
  readPortraitFile,
} from "@/lib/video/avatars";
import { listDeviceVoices, type DeviceVoice } from "@/lib/video/speech";
import { MIC_VOICE_ID, VOICES } from "@/lib/video/voices";
import { useStudio } from "@/lib/video/store";
import { cn } from "@/lib/utils";

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 rounded-sm px-3 text-sm transition-colors duration-150",
        active
          ? "bg-accent text-accent-fg"
          : "bg-elevated text-muted shadow-[var(--shadow-border)] hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function PortraitCard({
  active,
  src,
  label,
  onClick,
  children,
}: {
  active: boolean;
  src?: string;
  label: string;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-20 shrink-0 flex-col gap-1.5 text-left"
    >
      <span
        className={cn(
          "relative block h-28 w-20 overflow-hidden rounded-md bg-elevated shadow-[var(--shadow-border)] transition-[box-shadow] duration-150",
          active && "ring-1 ring-accent",
        )}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover object-top" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-subtle">
            {children}
          </span>
        )}
      </span>
      <span className={cn("text-xs", active ? "text-fg" : "text-muted")}>{label}</span>
    </button>
  );
}

export function CastPanel({ compact = false }: { compact?: boolean }) {
  const brief = useStudio((s) => s.brief);
  const project = useStudio((s) => s.project);
  const setCast = useStudio((s) => s.setCast);
  const previewVoice = useStudio((s) => s.previewVoice);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [phones, setPhones] = useState<DeviceVoice[]>([]);

  const avatarId = project?.avatarId ?? brief.avatarId;
  const avatarMode = project?.avatarMode ?? brief.avatarMode;
  const voiceId = project?.voiceId ?? brief.voiceId;
  const customUrl = project?.customAvatarUrl ?? brief.customAvatarUrl;
  const voice =
    VOICES.find((item) => item.id === voiceId) ??
    (voiceId.startsWith("dev:")
      ? { id: voiceId, name: "Phone", note: "Free voice on this device" }
      : VOICES[0]);
  const hostOn = avatarId !== NONE_AVATAR_ID;

  useEffect(() => {
    const load = () => setPhones(listDeviceVoices());
    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, []);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium text-muted">Host</legend>
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
          <PortraitCard
            active={avatarId === NONE_AVATAR_ID}
            label="None"
            onClick={() => setCast({ avatarId: NONE_AVATAR_ID })}
          >
            <span className="text-xs text-subtle">Off</span>
          </PortraitCard>
          {AVATARS.map((avatar) => (
            <PortraitCard
              key={avatar.id}
              active={avatarId === avatar.id}
              src={avatar.image}
              label={avatar.name}
              onClick={() => setCast({ avatarId: avatar.id })}
            />
          ))}
          <PortraitCard
            active={avatarId === CUSTOM_AVATAR_ID}
            src={customUrl}
            label="Photo"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="size-4" />
          </PortraitCard>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Upload a host photo"
          suppressHydrationWarning
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            void readPortraitFile(file)
              .then((url) => {
                setPhotoError(null);
                setCast({ avatarId: CUSTOM_AVATAR_ID, customAvatarUrl: url });
              })
              .catch((err: unknown) => {
                setPhotoError(err instanceof Error ? err.message : "Could not use that photo");
              });
          }}
        />
        {photoError ? <p className="mt-2 text-xs text-danger">{photoError}</p> : null}
        {!compact ? (
          <p className="mt-2 text-xs text-subtle">
            A host is a talking head over the cut — free, on this phone.
          </p>
        ) : null}
      </fieldset>

      {hostOn ? (
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-medium text-muted">Placement</legend>
          <div className="flex flex-wrap gap-2">
            {AVATAR_MODES.map((mode) => (
              <Chip
                key={mode.id}
                active={avatarMode === mode.id}
                onClick={() => setCast({ avatarMode: mode.id })}
              >
                {mode.label}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-xs text-subtle">
            {AVATAR_MODES.find((mode) => mode.id === avatarMode)?.note}
          </p>
        </fieldset>
      ) : null}

      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium text-muted">Voice-over</legend>
        <div className="flex flex-wrap gap-2">
          {VOICES.map((item) => (
            <Chip
              key={item.id}
              active={voiceId === item.id}
              onClick={() => setCast({ voiceId: item.id })}
            >
              {item.name}
            </Chip>
          ))}
          {phones.slice(0, 20).map((item) => (
            <Chip
              key={item.uri}
              active={voiceId === `dev:${item.uri}`}
              onClick={() => setCast({ voiceId: `dev:${item.uri}` })}
            >
              {item.name}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-xs text-subtle">
            {voiceId === MIC_VOICE_ID
              ? "Record a take on each scene. Those takes go into the saved file."
              : `${voice.note}. No tokens.`}
          </p>
          {voiceId !== MIC_VOICE_ID ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void previewVoice(voiceId)}
            >
              <Volume2 />
              Hear voice
            </Button>
          ) : null}
        </div>
      </fieldset>
    </div>
  );
}
