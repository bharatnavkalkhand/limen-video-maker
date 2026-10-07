import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { fakeVoiceEnergy, hasHost } from "@/lib/video/avatars";
import { formatClock, projectDuration, type Project, type Scene } from "@/lib/video/types";
import { speakLine, stopSpeaking, voiceUriFromId } from "@/lib/video/speech";
import { useStudio } from "@/lib/video/store";
import { HostOverlay } from "./host-overlay";

function sceneAt(project: Project, time: number) {
  let t = Math.max(0, time);
  for (let i = 0; i < project.scenes.length; i++) {
    const dur = project.scenes[i].durationSec;
    if (t < dur || i === project.scenes.length - 1) {
      return { scene: project.scenes[i], index: i, local: Math.min(t, dur), dur };
    }
    t -= dur;
  }
  const last = project.scenes[project.scenes.length - 1];
  return { scene: last, index: project.scenes.length - 1, local: last.durationSec, dur: last.durationSec };
}

type AudioGraph = {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  analyser: AnalyserNode;
  el: HTMLAudioElement;
};

let audioGraph: AudioGraph | null = null;

function attachAnalyser(el: HTMLAudioElement) {
  if (audioGraph?.el === el) {
    if (audioGraph.ctx.state === "suspended") void audioGraph.ctx.resume();
    return audioGraph.analyser;
  }
  const ctx = new AudioContext();
  const source = ctx.createMediaElementSource(el);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  analyser.connect(ctx.destination);
  audioGraph = { ctx, source, analyser, el };
  return analyser;
}

function Frame({
  scene,
  local,
  playing,
  reverse,
}: {
  scene: Scene | undefined;
  local: number;
  playing: boolean;
  reverse?: boolean;
}) {
  const t = scene ? Math.min(1, local / Math.max(0.001, scene.durationSec)) : 0;
  const scale = 1 + (playing ? 0.08 : 0.02) * t;
  const tx = (reverse ? 1 : -1) * 1.4 * t;
  const ty = (reverse ? -1 : 1) * 0.8 * t;

  return (
    <div className="absolute inset-0 overflow-hidden bg-surface">
      {scene?.imageUrl ? (
        <img
          src={scene.imageUrl}
          alt={scene.title}
          className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-fg/10"
          style={{
            transform: `scale(${scale}) translate(${tx}%, ${ty}%)`,
            transition: playing ? "none" : "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      ) : (
        <div className="flex h-full w-full flex-col justify-end bg-elevated px-6 py-8">
          <span className="mb-4 block h-px w-10 bg-accent" />
          <p className="font-display text-2xl font-medium tracking-tight text-fg md:text-3xl">
            {scene?.title ?? "Ready when you are"}
          </p>
        </div>
      )}
      {scene?.narration ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 caption-fade px-5 pb-5 pt-16">
          <p className="max-w-2xl text-sm text-fg/90 md:text-base">{scene.narration}</p>
        </div>
      ) : null}
    </div>
  );
}

export function Monitor() {
  const project = useStudio((s) => s.project);
  const stage = useStudio((s) => s.stage);
  const playing = useStudio((s) => s.playing);
  const playhead = useStudio((s) => s.playhead);
  const selectedId = useStudio((s) => s.selectedId);
  const setPlaying = useStudio((s) => s.setPlaying);
  const setPlayhead = useStudio((s) => s.setPlayhead);
  const loadDemo = useStudio((s) => s.loadDemo);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const lastScene = useRef<string | null>(null);
  const playheadRef = useRef(playhead);
  const [energy, setEnergy] = useState(0);

  playheadRef.current = playhead;

  const aspect = project?.aspect ?? "9:16";
  const compact = stage === "compose" || !project;
  const aspectClass =
    aspect === "9:16"
      ? compact
        ? "aspect-reel max-h-72"
        : "aspect-reel max-h-monitor"
      : aspect === "1:1"
        ? compact
          ? "aspect-frame max-h-72"
          : "aspect-frame max-h-monitor"
        : "aspect-wide";

  const duration = project ? projectDuration(project) : 0;
  const current = useMemo(() => {
    if (!project || project.scenes.length === 0) return null;
    if (!playing && selectedId) {
      const index = project.scenes.findIndex((s) => s.id === selectedId);
      if (index >= 0) {
        let start = 0;
        for (let i = 0; i < index; i++) start += project.scenes[i].durationSec;
        const local = Math.max(0, playhead - start);
        return {
          scene: project.scenes[index],
          index,
          local: Math.min(local, project.scenes[index].durationSec),
          dur: project.scenes[index].durationSec,
        };
      }
    }
    return sceneAt(project, playhead);
  }, [project, playing, playhead, selectedId]);

  const showHost = Boolean(
    project && hasHost(project.avatarId, project.customAvatarUrl),
  );

  useEffect(() => {
    if (!playing || !project) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = useStudio.getState().playhead + dt;
      const total = projectDuration(project);
      if (next >= total) {
        setPlayhead(total);
        setPlaying(false);
        return;
      }
      setPlayhead(next);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing, project, setPlayhead, setPlaying]);

  useEffect(() => {
    if (!playing || !current) {
      stopSpeaking();
      audioRef.current?.pause();
      stopRef.current?.();
      lastScene.current = null;
      return;
    }
    const scene = current.scene;
    if (lastScene.current === scene.id) return;
    lastScene.current = scene.id;
    stopSpeaking();
    audioRef.current?.pause();
    stopRef.current?.();

    if (scene.audioUrl) {
      const audio = audioRef.current;
      if (!audio) return;
      audio.src = scene.audioUrl;
      audio.currentTime = 0;
      try {
        attachAnalyser(audio);
      } catch {
        /* analyser unavailable */
      }
      void audio.play().catch(() => undefined);
    } else if (scene.narration) {
      const handle = speakLine(scene.narration, undefined, voiceUriFromId(project?.voiceId ?? "device"));
      stopRef.current = handle.stop;
    }
  }, [playing, current?.scene.id, current]);

  useEffect(() => {
    if (!playing || !showHost) {
      setEnergy(0);
      return;
    }
    const bins = new Uint8Array(64);
    let frame = 0;
    const loop = () => {
      const analyser = audioGraph?.analyser;
      if (analyser && current?.scene.audioUrl) {
        analyser.getByteFrequencyData(bins);
        let sum = 0;
        for (let i = 0; i < bins.length; i++) sum += bins[i];
        setEnergy(Math.min(1, (sum / bins.length / 255) * 1.85));
      } else {
        setEnergy(fakeVoiceEnergy(playheadRef.current));
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing, showHost, current?.scene.audioUrl]);

  useEffect(
    () => () => {
      stopSpeaking();
      stopRef.current?.();
    },
    [],
  );

  const canPlay = Boolean(project && project.scenes.length && stage !== "writing");

  return (
    <section className="w-full">
      <div
        className={cn(
          "relative mx-auto w-full overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]",
          project?.aspect === "9:16" || project?.aspect === "1:1" || !project
            ? "max-w-sm"
            : "max-w-4xl",
          aspectClass,
        )}
      >
        {project ? (
          <>
            <Frame
              scene={current?.scene}
              local={current?.local ?? 0}
              playing={playing}
              reverse={(current?.index ?? 0) % 2 === 1}
            />
            <HostOverlay
              avatarId={project.avatarId}
              customUrl={project.customAvatarUrl}
              mode={project.avatarMode}
              aspect={project.aspect}
              energy={playing ? energy : 0}
              speaking={playing}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={loadDemo}
            className="absolute inset-0"
            aria-label="Watch the sample cut"
          >
            <img
              src="/samples/sheet-1.jpg"
              alt="Sample still from The First Sheet"
              className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-fg/10"
            />
            <div className="absolute inset-0 bg-bg/35" />
            <div className="absolute inset-x-0 bottom-0 caption-fade px-5 pb-5 pt-16 text-left">
              <p className="text-xs font-medium uppercase tracking-widest text-muted">
                Sample cut
              </p>
              <p className="font-display text-2xl font-medium tracking-tight">
                The First Sheet
              </p>
            </div>
            <span className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-accent-fg">
              <Play className="size-5 translate-x-px" />
            </span>
          </button>
        )}

        {project ? (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-sm bg-bg/70 px-2 py-1 text-xs text-fg backdrop-blur-sm">
            <span className="font-medium">{project.title}</span>
            <span className="text-muted tabular-nums">{formatClock(duration)}</span>
          </div>
        ) : null}

        {canPlay ? (
          <button
            type="button"
            className="absolute bottom-3 right-3 z-20 flex size-11 items-center justify-center rounded-md bg-accent text-accent-fg"
            onClick={() => {
              if (playing) {
                setPlaying(false);
                stopSpeaking();
                audioRef.current?.pause();
              } else {
                if (project && playhead >= projectDuration(project) - 0.05) {
                  setPlayhead(0);
                }
                setPlaying(true);
              }
            }}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4 translate-x-px" />
            )}
          </button>
        ) : null}
        <audio ref={audioRef} preload="auto" className="hidden" />
      </div>
    </section>
  );
}
