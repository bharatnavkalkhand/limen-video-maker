import { useRef, useState } from "react";
import { Camera, ImagePlus, Mic, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { readStillFile } from "@/lib/video/avatars";
import { speakLine, stopSpeaking } from "@/lib/video/speech";
import { useStudio } from "@/lib/video/store";
import { formatClock, projectDuration } from "@/lib/video/types";
import { MIC_VOICE_ID } from "@/lib/video/voices";
import { cn } from "@/lib/utils";
import { CastPanel } from "./cast-panel";

export function ScriptPanel() {
  const project = useStudio((s) => s.project);
  const selectedId = useStudio((s) => s.selectedId);
  const selectScene = useStudio((s) => s.selectScene);
  const updateScene = useStudio((s) => s.updateScene);
  const produce = useStudio((s) => s.produce);
  const applyNote = useStudio((s) => s.applyNote);
  const hearScene = useStudio((s) => s.hearScene);
  const beginTake = useStudio((s) => s.beginTake);
  const finishTake = useStudio((s) => s.finishTake);
  const recordingId = useStudio((s) => s.recordingId);
  const error = useStudio((s) => s.error);
  const [note, setNote] = useState("");
  const [reading, setReading] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  if (!project) return null;
  const selected = project.scenes.find((s) => s.id === selectedId) ?? project.scenes[0];
  const wantsMic = project.voiceId === MIC_VOICE_ID;

  function onStill(file: File | undefined) {
    if (!file || !selected) return;
    void readStillFile(file)
      .then((url) => {
        updateScene(selected.id, { imageUrl: url, status: "ready", error: undefined });
      })
      .catch((err: unknown) => {
        useStudio.setState({
          error: err instanceof Error ? err.message : "Could not use that photo",
        });
      });
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-medium tracking-tight">{project.title}</h2>
        <p className="text-sm text-muted">{project.logline}</p>
        <p className="text-xs tabular-nums text-subtle">
          {project.scenes.length} scenes · {formatClock(projectDuration(project))} · token-free
        </p>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2">
        {project.scenes.map((scene, index) => (
          <li key={scene.id}>
            <button
              type="button"
              onClick={() => selectScene(scene.id)}
              className={cn(
                "flex min-h-11 w-full flex-col rounded-md px-3 py-3 text-left shadow-[var(--shadow-border)] transition-colors duration-150",
                selected?.id === scene.id ? "bg-elevated" : "bg-surface hover:bg-elevated",
              )}
            >
              <span className="text-xs tabular-nums text-subtle">
                {String(index + 1).padStart(2, "0")} · {formatClock(scene.durationSec)}
                {scene.audioUrl ? " · take" : ""}
              </span>
              <span className="text-sm font-medium">{scene.title}</span>
            </button>
          </li>
        ))}
      </ol>

      {selected ? (
        <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-subtle">
            Narration
          </label>
          <Textarea
            value={selected.narration}
            onChange={(e) =>
              updateScene(selected.id, {
                narration: e.target.value,
                status: "idle",
              })
            }
            className="min-h-24"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void hearScene(selected.id)}
            >
              <Volume2 />
              Read this line
            </Button>
            {recordingId === selected.id ? (
              <Button type="button" variant="danger" size="sm" onClick={() => void finishTake()}>
                <Square />
                Stop take
              </Button>
            ) : (
              <Button
                type="button"
                variant={wantsMic ? "primary" : "secondary"}
                size="sm"
                onClick={() => void beginTake(selected.id)}
              >
                <Mic />
                {selected.audioUrl ? "Retake voice" : "Record voice"}
              </Button>
            )}
          </div>

          <label className="mb-2 mt-4 block text-xs font-medium uppercase tracking-widest text-subtle">
            Shot
          </label>
          <Textarea
            value={selected.visualPrompt}
            onChange={(e) => updateScene(selected.id, { visualPrompt: e.target.value })}
            className="min-h-20"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => cameraRef.current?.click()}>
              <Camera />
              Camera
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => galleryRef.current?.click()}>
              <ImagePlus />
              Gallery
            </Button>
          </div>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            aria-label="Shoot a still"
            suppressHydrationWarning
            onChange={(event) => {
              onStill(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Choose a still"
            suppressHydrationWarning
            onChange={(event) => {
              onStill(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      ) : null}

      <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <CastPanel compact />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Director note — shorter, warmer…"
          className="h-11 min-w-0 flex-1 rounded-md bg-elevated px-3.5 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={note.trim().length < 4}
          onClick={() => {
            const value = note.trim();
            setNote("");
            void applyNote(value);
          }}
        >
          Revise
        </Button>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl bg-bg/90 p-3 shadow-[var(--shadow-border)] backdrop-blur-sm md:static md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={() => {
            if (reading) {
              stopSpeaking();
              setReading(false);
              return;
            }
            const lines = project.scenes.map((s) => s.narration);
            setReading(true);
            const play = (i: number) => {
              if (i >= lines.length) {
                setReading(false);
                return;
              }
              selectScene(project.scenes[i].id);
              speakLine(lines[i], () => play(i + 1));
            };
            play(0);
          }}
        >
          <Mic />
          {reading ? "Stop table read" : "Table read"}
        </Button>
        <Button type="button" className="w-full sm:w-auto" onClick={() => void produce()}>
          Make the cut
        </Button>
      </div>
    </div>
  );
}
