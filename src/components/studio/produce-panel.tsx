import { avatarById, CUSTOM_AVATAR_ID, hasHost } from "@/lib/video/avatars";
import { useStudio } from "@/lib/video/store";
import { voiceById } from "@/lib/video/voices";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  idle: "Waiting",
  shooting: "Laying stills",
  voicing: "Voicing",
  ready: "In the can",
  error: "Needs a retake",
};

export function ProducePanel() {
  const project = useStudio((s) => s.project);
  const producingLabel = useStudio((s) => s.producingLabel);
  if (!project) return null;
  const voice = voiceById(project.voiceId);
  const hostOn = hasHost(project.avatarId, project.customAvatarUrl);
  const hostName =
    project.avatarId === CUSTOM_AVATAR_ID
      ? "your photo"
      : avatarById(project.avatarId)?.name;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <p className="text-sm text-muted">{producingLabel || "Cutting the film"}</p>
      <p className="text-xs text-subtle">
        {voice.name}
        {hostOn && hostName ? ` · ${hostName} on camera` : ""}
      </p>
      <ul className="grid gap-2">
        {project.scenes.map((scene, index) => (
          <li
            key={scene.id}
            className="flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-3 shadow-[var(--shadow-border)]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                <span className="mr-2 tabular-nums text-subtle">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {scene.title}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 text-xs",
                scene.status === "ready" && "text-ok",
                "text-muted",
              )}
            >
              {labels[scene.status]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
