import type { AvatarMode } from "./types";

export type AvatarOption = {
  id: string;
  name: string;
  note: string;
  voiceId: string;
  image: string;
};

export const NONE_AVATAR_ID = "none";
export const CUSTOM_AVATAR_ID = "custom";

export const AVATARS: AvatarOption[] = [
  { id: "eve", name: "Eve", note: "Warm narrator", voiceId: "eve", image: "/avatars/eve.jpg" },
  { id: "leo", name: "Leo", note: "Deep documentary", voiceId: "leo", image: "/avatars/leo.jpg" },
  { id: "ara", name: "Ara", note: "Clear presenter", voiceId: "ara", image: "/avatars/ara.jpg" },
  { id: "rex", name: "Rex", note: "Bold host", voiceId: "rex", image: "/avatars/rex.jpg" },
  { id: "luna", name: "Luna", note: "Calm evening", voiceId: "luna", image: "/avatars/luna.jpg" },
  { id: "sal", name: "Sal", note: "Soft story", voiceId: "sal", image: "/avatars/sal.jpg" },
];

export const AVATAR_MODES: { id: AvatarMode; label: string; note: string }[] = [
  { id: "inset", label: "Inset", note: "Talking head over the cut" },
  { id: "host", label: "Host", note: "Larger presenter in frame" },
];

export function avatarById(id: string) {
  return AVATARS.find((avatar) => avatar.id === id) ?? null;
}

export function avatarSrc(id: string, customUrl?: string) {
  if (id === CUSTOM_AVATAR_ID) return customUrl ?? "";
  return avatarById(id)?.image ?? "";
}

export function hasHost(id: string, customUrl?: string) {
  if (!id || id === NONE_AVATAR_ID) return false;
  return Boolean(avatarSrc(id, customUrl));
}

export function fakeVoiceEnergy(time: number) {
  const a = Math.abs(Math.sin(time * 8.4));
  const b = Math.abs(Math.sin(time * 3.1 + 0.4));
  const c = Math.abs(Math.sin(time * 13.7));
  return Math.min(1, 0.18 + a * 0.55 * (0.35 + b) + c * 0.12);
}

export function bufferEnergy(buffer: AudioBuffer, timeSec: number) {
  const sample = Math.floor(timeSec * buffer.sampleRate);
  const channel = buffer.getChannelData(0);
  const window = Math.min(1024, channel.length);
  let sum = 0;
  for (let i = 0; i < window; i++) {
    const v = channel[Math.min(channel.length - 1, sample + i)] ?? 0;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / window);
  return Math.min(1, rms * 4.2);
}

export async function readPortraitFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a photograph");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that photo"));
      el.src = url;
    });
    const scale = Math.min(720 / image.width, 960 / image.height, 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process that photo");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function readStillFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a photograph");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that photo"));
      el.src = url;
    });
    const scale = Math.min(1280 / image.width, 1280 / image.height, 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process that photo");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}
