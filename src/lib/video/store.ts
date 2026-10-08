import { create } from "zustand";
import { DEMO_PROJECT } from "./demo";
import { exportProject, shareOrDownload } from "./compositor";
import { generateSceneImage, generateSceneVoice, generateScript, reviseScript } from "./ai";
import { cancelTake, startTake, stopTake } from "./record";
import { speakLine, stopSpeaking, voiceUriFromId } from "./speech";
import { VOICE_SAMPLE } from "./voices";
import type {
  AspectId,
  AvatarMode,
  LengthId,
  LookId,
  Project,
  Scene,
  Stage,
} from "./types";

type Brief = {
  prompt: string;
  look: LookId;
  length: LengthId;
  aspect: AspectId;
  voiceId: string;
  avatarId: string;
  avatarMode: AvatarMode;
  customAvatarUrl?: string;
};

type CastPatch = Partial<
  Pick<Brief, "voiceId" | "avatarId" | "avatarMode" | "customAvatarUrl">
>;

type StudioState = {
  stage: Stage;
  brief: Brief;
  project: Project | null;
  selectedId: string | null;
  playing: boolean;
  playhead: number;
  writingNote: string;
  producingLabel: string;
  exporting: boolean;
  exportRatio: number;
  error: string | null;
  recordingId: string | null;
  setBrief: (patch: Partial<Brief>) => void;
  setCast: (patch: CastPatch) => void;
  selectScene: (id: string) => void;
  updateScene: (id: string, patch: Partial<Scene>) => void;
  loadDemo: () => void;
  reset: () => void;
  writeScript: () => Promise<void>;
  applyNote: (note: string) => Promise<void>;
  produce: () => Promise<void>;
  retryScene: (id: string) => Promise<void>;
  setPlaying: (playing: boolean) => void;
  setPlayhead: (time: number) => void;
  exportCut: () => Promise<void>;
  previewVoice: (voiceId?: string) => Promise<void>;
  hearScene: (id: string) => Promise<void>;
  beginTake: (id: string) => Promise<void>;
  finishTake: () => Promise<void>;
};

const initialBrief: Brief = {
  prompt: "",
  look: "cinema",
  length: "short",
  aspect: "9:16",
  voiceId: "device",
  avatarId: "eve",
  avatarMode: "inset",
};

function patchScene(project: Project, id: string, patch: Partial<Scene>): Project {
  return {
    ...project,
    scenes: project.scenes.map((scene) =>
      scene.id === id ? { ...scene, ...patch } : scene,
    ),
  };
}

function withStills(project: Project): Project {
  return {
    ...project,
    scenes: project.scenes.map((scene, index) => ({
      ...scene,
      imageUrl: scene.imageUrl || STILLS[index % STILLS.length],
      status: "ready" as const,
      error: undefined,
    })),
  };
}

export const useStudio = create<StudioState>((set, get) => ({
  stage: "compose",
  brief: initialBrief,
  project: null,
  selectedId: null,
  playing: false,
  playhead: 0,
  writingNote: "",
  producingLabel: "",
  exporting: false,
  exportRatio: 0,
  error: null,
  recordingId: null,

  setBrief: (patch) =>
    set((s) => ({ brief: { ...s.brief, ...patch }, error: null })),

  setCast: (patch) => {
    set((s) => ({
      brief: { ...s.brief, ...patch },
      project: s.project ? { ...s.project, ...patch } : s.project,
      error: null,
    }));
  },

  selectScene: (id) => set({ selectedId: id }),

  updateScene: (id, patch) =>
    set((s) => ({
      project: s.project ? patchScene(s.project, id, patch) : s.project,
    })),

  loadDemo: () => {
    stopSpeaking();
    void cancelTake();
    set({
      stage: "studio",
      project: structuredClone(DEMO_PROJECT),
      selectedId: DEMO_PROJECT.scenes[0]?.id ?? null,
      playing: false,
      playhead: 0,
      error: null,
      recordingId: null,
    });
  },

  reset: () => {
    stopSpeaking();
    void cancelTake();
    set({
      stage: "compose",
      project: null,
      selectedId: null,
      playing: false,
      playhead: 0,
      writingNote: "",
      producingLabel: "",
      exporting: false,
      exportRatio: 0,
      error: null,
      recordingId: null,
    });
  },

  writeScript: async () => {
  const { brief } = get();

  if (brief.prompt.trim().length < 8) {
    set({ error: "Give the director a little more to work with." });
    return;
  }

  set({
    stage: "writing",
    error: null,
    writingNote: "Grok is writing your script...",
  });

  try {
    const result = await generateScript({
      data: {
        prompt: brief.prompt,
        look: brief.look,
        length: brief.length,
        aspect: brief.aspect,
      },
    });

    const project: Project = {
      id: crypto.randomUUID(),
      title: result.title,
      logline: result.logline,
      prompt: brief.prompt,
      look: brief.look,
      length: brief.length,
      aspect: brief.aspect,
      voiceId: brief.voiceId,
      avatarId: brief.avatarId,
      avatarMode: brief.avatarMode,
      customAvatarUrl: brief.customAvatarUrl,
      scenes: result.scenes.map((scene) => ({
        ...scene,
        status: "idle",
      })),
    };

    set({
      stage: "script",
      project,
      selectedId: project.scenes[0]?.id ?? null,
      playhead: 0,
      playing: false,
      writingNote: "",
    });
  } catch (error) {
    set({
      stage: "compose",
      error: error instanceof Error ? error.message : "Script generation failed.",
      writingNote: "",
    });
  }
},
  applyNote: async (note) => {
    const { project } = get();
    if (!project) return;
    set({ writingNote: "Revising the cut", error: null });
    const next = reviseLocalProject(project, note);
    set({
      stage: "script",
      project: next,
      selectedId: next.scenes[0]?.id ?? null,
    });
  },

  produce: async () => {
    const { project } = get();
    if (!project) return;
    stopSpeaking();
    set({ stage: "producing", error: null, playing: false, producingLabel: "Laying stills" });
    await new Promise((resolve) => setTimeout(resolve, 220));
    const next = withStills(get().project ?? project);
    set({
      project: next,
      stage: "studio",
      producingLabel: "",
      selectedId: next.scenes[0]?.id ?? null,
      playhead: 0,
    });
  },

  retryScene: async (id) => {
    const { project } = get();
    if (!project) return;
    const index = project.scenes.findIndex((item) => item.id === id);
    if (index < 0) return;
    set((s) => ({
      project: s.project
        ? patchScene(s.project, id, {
            imageUrl: STILLS[index % STILLS.length],
            status: "ready",
            error: undefined,
          })
        : s.project,
    }));
  },

  setPlaying: (playing) => set({ playing }),
  setPlayhead: (playhead) => set({ playhead }),

  exportCut: async () => {
    const { project } = get();
    if (!project) return;
    stopSpeaking();
    set({ exporting: true, exportRatio: 0, playing: false, error: null });
    try {
      const blob = await exportProject(project, ({ ratio }) => {
        set({ exportRatio: ratio });
      });
      await shareOrDownload(blob, project.title);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Could not export that cut.",
      });
    } finally {
      set({ exporting: false, exportRatio: 0 });
    }
  },

  previewVoice: async (voiceId) => {
    const { brief, project } = get();
    const id = voiceId ?? project?.voiceId ?? brief.voiceId;
    stopSpeaking();
    speakLine(VOICE_SAMPLE, undefined, voiceUriFromId(id));
  },

  hearScene: async (id) => {
    const { project } = get();
    if (!project) return;
    const scene = project.scenes.find((item) => item.id === id);
    if (!scene) return;
    stopSpeaking();
    if (scene.audioUrl) {
      const audio = new Audio(scene.audioUrl);
      await audio.play().catch(() => undefined);
      return;
    }
    speakLine(scene.narration, undefined, voiceUriFromId(project.voiceId));
  },

  beginTake: async (id) => {
    stopSpeaking();
    set({ playing: false, error: null });
    try {
      if (get().recordingId) await cancelTake();
      await startTake();
      set({ recordingId: id });
    } catch (err) {
      set({
        recordingId: null,
        error: err instanceof Error ? err.message : "Could not open the mic.",
      });
    }
  },

  finishTake: async () => {
    const id = get().recordingId;
    try {
      const take = await stopTake();
      if (id) {
        set((s) => ({
          project: s.project
            ? patchScene(s.project, id, {
                audioUrl: take.url,
                durationSec:
                  take.durationSec > 1
                    ? take.durationSec
                    : (s.project.scenes.find((scene) => scene.id === id)?.durationSec ?? 5),
                status: "ready",
                error: undefined,
              })
            : s.project,
          recordingId: null,
        }));
      } else {
        set({ recordingId: null });
      }
    } catch (err) {
      set({
        recordingId: null,
        error: err instanceof Error ? err.message : "Could not keep that take.",
      });
    }
  },
}));

