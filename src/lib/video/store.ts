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
          voiceId: brief.voiceId,
        },
      });

      const project = result.project;

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
        error:
          error instanceof Error
            ? error.message
            : "Script generation failed.",
        writingNote: "",
      });
    }
  },
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
    const { project, brief } = get();

    if (!project) return;

    set({
      writingNote: "Grok is revising the cut...",
      error: null,
    });

    try {
      const result = await reviseScript({
        data: {
          note,
          look: brief.look,
          aspect: brief.aspect,
          script: {
            title: project.title,
            logline: project.logline,
            scenes: project.scenes,
          },
        },
      });

      const nextProject: Project = {
        ...project,
        title: result.title,
        logline: result.logline,
        scenes: result.scenes,
      };

      set({
        stage: "script",
        project: nextProject,
        selectedId: nextProject.scenes[0]?.id ?? null,
        writingNote: "",
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Could not revise the script.",
        writingNote: "",
      });
    }
  },

      produce: async () => {
    const { project } = get();

    if (!project) return;

    stopSpeaking();

    set({
      stage: "producing",
      error: null,
      playing: false,
      producingLabel: "Generating AI images and voices...",
    });

    try {
      const scenes = [...project.scenes];

      for (let index = 0; index < scenes.length; index++) {
        const scene = scenes[index];

        // 1. Generate AI image
        set({
          producingLabel: `Generating image ${index + 1} of ${scenes.length}...`,
        });

        const imageResult = await generateSceneImage({
          data: {
            visualPrompt: scene.visualPrompt,
            look: project.look,
            aspect: project.aspect,
          },
        });

        if (!imageResult.ok) {
          throw new Error(imageResult.error);
        }

        // Save image immediately
        set((state) => ({
          project: state.project
            ? patchScene(state.project, scene.id, {
                imageUrl: imageResult.imageUrl,
                status: "ready",
                error: undefined,
              })
            : state.project,
        }));

        // 2. Generate AI voice
        if (
          project.voiceId &&
          project.voiceId !== "device" &&
          scene.narration.trim()
        ) {
          set({
            producingLabel: `Generating voice ${index + 1} of ${scenes.length}...`,
          });

          const voiceResult = await generateSceneVoice({
            data: {
              text: scene.narration,
              voiceId: project.voiceId,
            },
          });

          if (!voiceResult.ok) {
            throw new Error(voiceResult.error);
          }

          // Save voice immediately
          set((state) => ({
            project: state.project
              ? patchScene(state.project, scene.id, {
                  audioUrl: voiceResult.audioUrl,
                  status: "ready",
                  error: undefined,
                })
              : state.project,
          }));
        }
      }

      const next = get().project ?? project;

      set({
        project: next,
        stage: "studio",
        producingLabel: "",
        selectedId: next.scenes[0]?.id ?? null,
        playhead: 0,
      });
    } catch (error) {
      set({
        stage: "script",
        producingLabel: "",
        error:
          error instanceof Error
            ? error.message
            : "Could not generate the scene images and voices.",
      });
    }
  },

    retryScene: async (id) => {
    const { project } = get();

    if (!project) return;

    const scene = project.scenes.find((item) => item.id === id);

    if (!scene) return;

    set({
      error: null,
      producingLabel: "Regenerating image...",
    });

    try {
      const result = await generateSceneImage({
        data: {
          visualPrompt: scene.visualPrompt,
          look: project.look,
          aspect: project.aspect,
        },
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      set((state) => ({
        project: state.project
          ? patchScene(state.project, id, {
              imageUrl: result.imageUrl,
              status: "ready",
              error: undefined,
            })
          : state.project,
        producingLabel: "",
      }));
    } catch (error) {
      set({
        producingLabel: "",
        error:
          error instanceof Error
            ? error.message
            : "Could not regenerate this image.",
      });
    }
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

