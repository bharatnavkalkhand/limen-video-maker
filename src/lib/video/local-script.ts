import { lengthById, type Project, type Scene } from "./types";
import type { AspectId, LengthId, LookId } from "./types";

export const STILLS = [
  "/samples/sheet-1.jpg",
  "/samples/sheet-2.jpg",
  "/samples/sheet-3.jpg",
  "/samples/sheet-4.jpg",
];

type Brief = {
  prompt: string;
  look: LookId;
  length: LengthId;
  aspect: AspectId;
  voiceId: string;
  avatarId: string;
  avatarMode: Project["avatarMode"];
  customAvatarUrl?: string;
};

function wordDuration(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(45, Math.max(4.5, words / 2.4 + 0.7));
}

function splitBeats(text: string) {
  const cleaned = text.replace(/\r/g, "").trim();
  const parts = cleaned
    .split(/[\n।]+|(?<=[.!?])\s+/)
    .map((part) => part.trim().replace(/^[-–—]\s*/, ""))
    .filter((part) => part.length > 2);
  return parts.length ? parts : [cleaned];
}

function titleCase(text: string) {
  const words = text
    .replace(/["“”]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
  if (!words.length) return "Untitled";
  return words
    .map((word) => {
      const lower = word.toLowerCase();
      if (["a", "an", "the", "of", "and", "to", "in", "on"].includes(lower) && word !== words[0]) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function sceneTitle(beat: string, index: number) {
  const clipped = beat.replace(/[.!?]+$/g, "");
  const words = clipped.split(/\s+/).filter(Boolean).slice(0, 4);
  return words.length ? titleCase(words.join(" ")) : `Scene ${index + 1}`;
}

function fitBeats(beats: string[], count: number) {
  if (beats.length === count) return beats;
  if (beats.length > count) {
    const sized: string[] = [];
    const size = Math.ceil(beats.length / count);
    for (let i = 0; i < count; i++) {
      sized.push(beats.slice(i * size, (i + 1) * size).join(" ").trim());
    }
    return sized.map((beat) => beat || beats[beats.length - 1]);
  }
  const extra = [...beats];
  while (extra.length < count) {
    extra.push(beats[extra.length % beats.length]);
  }
  return extra;
}

export function draftLocalProject(brief: Brief, prior?: Project | null): Project {
  const length = lengthById(brief.length);
  const prompt = brief.prompt.trim();
  const beats = fitBeats(splitBeats(prompt), length.sceneCount);
  const title = titleCase(prompt.split(/[.!?\n]/)[0] ?? prompt);
  const logline = prompt.length > 180 ? `${prompt.slice(0, 177).trim()}…` : prompt;

  const scenes: Scene[] = beats.map((beat, index) => {
    const previous = prior?.scenes[index];
    const narration = beat.slice(0, 1200);
    return {
      id: previous?.id ?? (globalThis.crypto?.randomUUID?.() ?? `scene-${Date.now()}-${index}`),
      title: sceneTitle(beat, index),
      narration,
      visualPrompt: beat.slice(0, 500),
      durationSec: previous?.audioUrl ? previous.durationSec : wordDuration(narration),
      imageUrl: previous?.imageUrl ?? STILLS[index % STILLS.length],
      audioUrl: previous?.audioUrl,
      status: "idle",
    };
  });

  return {
    id: prior?.id ?? (globalThis.crypto?.randomUUID?.() ?? `film-${Date.now()}`),
    title: title.slice(0, 48),
    logline,
    prompt,
    look: brief.look,
    length: brief.length,
    aspect: brief.aspect,
    voiceId: brief.voiceId,
    avatarId: brief.avatarId,
    avatarMode: brief.avatarMode,
    customAvatarUrl: brief.customAvatarUrl,
    scenes,
  };
}

export function reviseLocalProject(project: Project, note: string): Project {
  const hint = note.trim();
  const shorter = /short|tight|brief|less/i.test(hint);
  const scenes = project.scenes.map((scene) => {
    let narration = scene.narration;
    if (shorter) {
      const words = narration.split(/\s+/);
      narration = words.slice(0, Math.max(8, Math.ceil(words.length * 0.7))).join(" ");
    } else if (hint.length < 120 && !/warm|science|cinematic/i.test(hint)) {
      narration = `${narration.replace(/[.!?]+$/, "")}. ${hint}`.slice(0, 1200);
    }
    return {
      ...scene,
      narration,
      durationSec: scene.audioUrl ? scene.durationSec : wordDuration(narration),
      status: "idle" as const,
    };
  });
  return {
    ...project,
    logline: hint.length <= 180 ? hint : project.logline,
    scenes,
  };
}
