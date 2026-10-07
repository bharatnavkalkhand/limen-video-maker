import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { avatarById, CUSTOM_AVATAR_ID, hasHost } from "@/lib/video/avatars";
import { formatClock, projectDuration } from "@/lib/video/types";
import { voiceById } from "@/lib/video/voices";
import { useStudio } from "@/lib/video/store";
import { cn } from "@/lib/utils";

export function StudioPanel() {
  const project = useStudio((s) => s.project);
  const playhead = useStudio((s) => s.playhead);
  const selectedId = useStudio((s) => s.selectedId);
  const selectScene = useStudio((s) => s.selectScene);
  const setPlayhead = useStudio((s) => s.setPlayhead);
  const setPlaying = useStudio((s) => s.setPlaying);
  const exportCut = useStudio((s) => s.exportCut);
  const exporting = useStudio((s) => s.exporting);
  const exportRatio = useStudio((s) => s.exportRatio);
  const error = useStudio((s) => s.error);

  if (!project) return null;
  const total = projectDuration(project);
  const voiced = project.scenes.some((s) => s.audioUrl);
  const host = hasHost(project.avatarId, project.customAvatarUrl);
  const hostName =
    project.avatarId === CUSTOM_AVATAR_ID
      ? "Your photo"
      : (avatarById(project.avatarId)?.name ?? "Host");
  const voice = voiceById(project.voiceId);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight">{project.title}</h2>
          <p className="text-sm text-muted">{project.logline}</p>
          <p className="mt-1 text-xs text-subtle">
            Voice-over · {voice.name}
            {host ? ` · Host · ${hostName}` : ""}
          </p>
        </div>
        <p className="text-xs tabular-nums text-subtle">
          {formatClock(playhead)} / {formatClock(total)}
        </p>
      </div>

      <div
        className="relative h-1.5 overflow-hidden rounded-full bg-elevated"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={playhead}
      >
        <div
          className="absolute inset-y-0 left-0 bg-accent"
          style={{ width: `${total ? (playhead / total) * 100 : 0}%` }}
        />
      </div>

      <ol className="flex gap-2 overflow-x-auto pb-1">
        {project.scenes.map((scene, index) => {
          let start = 0;
          for (let i = 0; i < index; i++) start += project.scenes[i].durationSec;
          const active = selectedId === scene.id;
          return (
            <li key={scene.id} className="min-w-28 flex-1">
              <button
                type="button"
                onClick={() => {
                  selectScene(scene.id);
                  setPlayhead(start);
                  setPlaying(false);
                }}
                className={cn(
                  "flex h-full min-h-24 w-full flex-col overflow-hidden rounded-md text-left shadow-[var(--shadow-border)]",
                  active ? "ring-1 ring-accent" : "",
                )}
              >
                <div className="relative h-16 w-full bg-elevated">
                  {scene.imageUrl ? (
                    <img
                      src={scene.imageUrl}
                      alt=""
                      className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-fg/10"
                    />
                  ) : null}
                </div>
                <span className="px-2 py-2 text-xs">
                  <span className="block truncate font-medium">{scene.title}</span>
                  <span className="tabular-nums text-subtle">
                    {formatClock(scene.durationSec)}
                    {scene.audioUrl ? " · take" : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <p className="text-xs text-subtle">
        {voiced
          ? "Recorded takes are in the saved file, with captions and the host."
          : "Phone voice plays here. Record a take on a scene if you want that voice in the saved file."}
      </p>

      <Button
        type="button"
        onClick={() => void exportCut()}
        disabled={exporting}
        className="w-full sm:w-auto"
      >
        <Share2 />
        {exporting ? `Recording ${Math.round(exportRatio * 100)}%` : "Save cut"}
      </Button>
    </div>
  );
}
