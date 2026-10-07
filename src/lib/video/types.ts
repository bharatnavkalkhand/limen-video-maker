export const LOOKS = [
  {
    id: "cinema",
    label: "Cinema",
    suffix:
      "cinematic still photograph, anamorphic 35mm, naturalistic lighting, shallow depth of field, fine film grain, no text, no letters, no logos, no watermark",
  },
  {
    id: "editorial",
    label: "Editorial",
    suffix:
      "editorial magazine photography, precise composition, high detail, muted palette, no text, no letters, no logos, no watermark",
  },
  {
    id: "essay",
    label: "Essay",
    suffix:
      "documentary photojournalism, available light, unstaged, 50mm lens, honest texture, no text, no letters, no logos, no watermark",
  },
  {
    id: "graphic",
    label: "Graphic",
    suffix:
      "bold graphic still, geometric light and shadow, limited palette, abstract or architectural, no letters, no logos, no text, no watermark",
  },
  {
    id: "story",
    label: "Storybook",
    suffix:
      "painterly cinematic illustration, tactile, storybook realism, atmospheric, no text, no letters, no logos, no watermark",
  },
] as const;

export const LENGTHS = [
  { id: "short", label: "20s", sceneCount: 3, seconds: 20 },
  { id: "featurette", label: "35s", sceneCount: 5, seconds: 35 },
  { id: "reel", label: "50s", sceneCount: 6, seconds: 50 },
  { id: "five", label: "5 min", sceneCount: 12, seconds: 300 },
  { id: "ten", label: "10 min", sceneCount: 24, seconds: 600 },
] as const;

export const ASPECTS = [
  { id: "16:9", label: "Wide", frame: "wide" },
  { id: "9:16", label: "Tall", frame: "reel" },
  { id: "1:1", label: "Square", frame: "frame" },
] as const;

export type LookId = (typeof LOOKS)[number]["id"];
export type LengthId = (typeof LENGTHS)[number]["id"];
export type AspectId = (typeof ASPECTS)[number]["id"];
export type AvatarMode = "inset" | "host";

export type SceneStatus = "idle" | "shooting" | "voicing" | "ready" | "error";

export type Scene = {
  id: string;
  title: string;
  narration: string;
  visualPrompt: string;
  durationSec: number;
  imageUrl?: string;
  audioUrl?: string;
  status: SceneStatus;
  error?: string;
};

export type Project = {
  id: string;
  title: string;
  logline: string;
  prompt: string;
  look: LookId;
  length: LengthId;
  aspect: AspectId;
  voiceId: string;
  avatarId: string;
  avatarMode: AvatarMode;
  customAvatarUrl?: string;
  scenes: Scene[];
};

export type Stage = "compose" | "writing" | "script" | "producing" | "studio";

export function lengthById(id: LengthId) {
  return LENGTHS.find((item) => item.id === id) ?? LENGTHS[0];
}

export function lookById(id: LookId) {
  return LOOKS.find((item) => item.id === id) ?? LOOKS[0];
}

export function projectDuration(project: Project) {
  return project.scenes.reduce((sum, scene) => sum + scene.durationSec, 0);
}

export function formatClock(seconds: number) {
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60);
  const s = Math.floor(clamped % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
