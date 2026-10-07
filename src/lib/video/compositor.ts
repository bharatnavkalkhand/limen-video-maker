import { avatarSrc, bufferEnergy, fakeVoiceEnergy, hasHost } from "./avatars";
import type { AspectId, AvatarMode, Project, Scene } from "./types";

export type ExportProgress = {
  ratio: number;
  label: string;
};

const SIZE: Record<AspectId, { width: number; height: number }> = {
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1080 },
  "1:1": { width: 1080, height: 1080 },
};

function pickMime() {
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "video/webm";
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load a frame"));
    image.src = src;
  });
}

async function decodeAudio(ctx: AudioContext, url: string) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return ctx.decodeAudioData(buf.slice(0));
}

function coverDraw(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  t: number,
  reverse: boolean,
) {
  const progress = reverse ? 1 - t : t;
  const scale = 1 + 0.1 * progress;
  const shiftX = (reverse ? 1 : -1) * 0.02 * progress * width;
  const shiftY = (reverse ? -1 : 1) * 0.015 * progress * height;
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const cover = Math.max(width / iw, height / ih) * scale;
  const dw = iw * cover;
  const dh = ih * cover;
  const dx = (width - dw) / 2 + shiftX;
  const dy = (height - dh) / 2 + shiftY;
  ctx.drawImage(image, dx, dy, dw, dh);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function avatarBox(
  width: number,
  height: number,
  mode: AvatarMode,
  aspect: AspectId,
) {
  const tall = aspect === "9:16";
  const host = mode === "host";
  const boxH = height * (host ? (tall ? 0.36 : 0.46) : tall ? 0.2 : 0.3);
  const boxW = boxH * 0.78;
  const pad = Math.round(width * 0.032);
  const caption = height * (tall ? 0.2 : 0.16);
  return {
    x: pad,
    y: height - caption - boxH - pad * 0.4,
    w: boxW,
    h: boxH,
  };
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  mode: AvatarMode,
  aspect: AspectId,
  energy: number,
) {
  const box = avatarBox(width, height, mode, aspect);
  const scale = 1 + energy * 0.035;
  const jaw = energy * 0.022 * box.h;
  const w = box.w * scale;
  const h = box.h * scale;
  const x = box.x - (w - box.w) / 2;
  const y = box.y - (h - box.h) / 2;
  const radius = Math.min(w, h) * 0.12;

  ctx.save();
  ctx.shadowColor = `rgba(201, 208, 215, ${0.12 + energy * 0.35})`;
  ctx.shadowBlur = 10 + energy * 28;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = "#121214";
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const cover = Math.max(w / iw, h / ih);
  const dw = iw * cover;
  const dh = ih * cover;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2 + jaw;
  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = `rgba(201, 208, 215, ${0.4 + energy * 0.45})`;
  ctx.lineWidth = 1.5 + energy * 1.5;
  roundRect(ctx, x, y, w, h, radius);
  ctx.stroke();
  ctx.restore();

  const barX = x + w + Math.max(6, width * 0.008);
  const barH = h * 0.28;
  const barY = y + h - barH;
  const bars = 4;
  for (let i = 0; i < bars; i++) {
    const amp = 0.25 + ((Math.sin(energy * 9 + i) + 1) / 2) * energy;
    const bh = Math.max(4, barH * (0.2 + amp * (0.5 + i * 0.12)));
    ctx.fillStyle = `rgba(244, 244, 241, ${0.35 + energy * 0.5})`;
    ctx.fillRect(barX + i * 4, barY + barH - bh, 2, bh);
  }
}

function titleCard(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  width: number,
  height: number,
) {
  ctx.fillStyle = "#121214";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#c9d0d7";
  ctx.fillRect(width * 0.1, height / 2 - 1, width * 0.08, 2);
  ctx.fillStyle = "#f4f4f1";
  ctx.font = `500 ${Math.round(width * 0.045)}px "Newsreader", serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(scene.title, width * 0.1, height / 2 + 28, width * 0.8);
}

function caption(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
) {
  const pad = Math.round(width * 0.05);
  const bar = Math.round(height * 0.22);
  const gradient = ctx.createLinearGradient(0, height - bar, 0, height);
  gradient.addColorStop(0, "rgba(9,9,11,0)");
  gradient.addColorStop(0.35, "rgba(9,9,11,0.55)");
  gradient.addColorStop(1, "rgba(9,9,11,0.92)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, height - bar, width, bar);
  ctx.fillStyle = "#f4f4f1";
  ctx.font = `500 ${Math.round(width * 0.022)}px "Sora", sans-serif`;
  wrapText(ctx, text, pad, height - pad - 8, width - pad * 2, Math.round(width * 0.032));
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  const shown = lines.slice(0, 3);
  shown.forEach((line, i) => {
    ctx.fillText(line, x, y - (shown.length - 1 - i) * lineHeight, maxWidth);
  });
}

function slug(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "lumen-cut"
  );
}

function sceneAtTime(project: Project, time: number) {
  let t = Math.max(0, time);
  let index = 0;
  for (let i = 0; i < project.scenes.length; i++) {
    const dur = project.scenes[i].durationSec;
    if (t <= dur || i === project.scenes.length - 1) {
      index = i;
      break;
    }
    t -= dur;
  }
  const scene = project.scenes[index];
  return { scene, index, local: Math.min(t, scene.durationSec) };
}

export async function exportProject(
  project: Project,
  onProgress: (progress: ExportProgress) => void,
): Promise<Blob> {
  const { width, height } = SIZE[project.aspect];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not open the recorder");

  const frames = await Promise.all(
    project.scenes.map(async (scene) => {
      if (!scene.imageUrl) return null;
      try {
        return await loadImage(scene.imageUrl);
      } catch {
        return null;
      }
    }),
  );

  const hostSrc = avatarSrc(project.avatarId, project.customAvatarUrl);
  let hostImage: HTMLImageElement | null = null;
  if (hasHost(project.avatarId, project.customAvatarUrl) && hostSrc) {
    try {
      hostImage = await loadImage(hostSrc);
    } catch {
      hostImage = null;
    }
  }

  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  let cursor = 0;
  const hasAudio = project.scenes.some((scene) => scene.audioUrl);
  const audioBuffers: Array<AudioBuffer | null> = [];

  if (hasAudio) {
    for (const scene of project.scenes) {
      if (!scene.audioUrl) {
        audioBuffers.push(null);
        cursor += scene.durationSec;
        continue;
      }
      try {
        const buffer = await decodeAudio(audioCtx, scene.audioUrl);
        audioBuffers.push(buffer);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(dest);
        source.start(cursor);
        cursor += buffer.duration;
      } catch {
        audioBuffers.push(null);
        cursor += scene.durationSec;
      }
    }
  }

  const total = project.scenes.reduce((sum, scene) => sum + scene.durationSec, 0);
  const canvasStream = canvas.captureStream(30);
  const tracks = [
    ...canvasStream.getVideoTracks(),
    ...(hasAudio ? dest.stream.getAudioTracks() : []),
  ];
  const mixed = new MediaStream(tracks);
  const mimeType = pickMime();
  const recorder = new MediaRecorder(mixed, { mimeType, videoBitsPerSecond: 4_000_000 });
  const chunks: BlobPart[] = [];

  const blobPromise = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error("Recording failed"));
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  if (audioCtx.state === "suspended") await audioCtx.resume();
  recorder.start(200);

  const started = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsed = (performance.now() - started) / 1000;
      if (elapsed >= total) {
        drawAt(ctx, project, frames, hostImage, audioBuffers, width, height, total - 0.001);
        onProgress({ ratio: 1, label: "Finishing cut" });
        resolve();
        return;
      }
      drawAt(ctx, project, frames, hostImage, audioBuffers, width, height, elapsed);
      onProgress({
        ratio: elapsed / total,
        label: "Recording cut",
      });
      requestAnimationFrame(tick);
    };
    tick();
  });

  await new Promise((r) => setTimeout(r, 180));
  recorder.stop();
  const blob = await blobPromise;
  await audioCtx.close().catch(() => undefined);
  canvasStream.getTracks().forEach((track) => track.stop());
  return blob;
}

function drawAt(
  ctx: CanvasRenderingContext2D,
  project: Project,
  frames: Array<HTMLImageElement | null>,
  hostImage: HTMLImageElement | null,
  audioBuffers: Array<AudioBuffer | null>,
  width: number,
  height: number,
  time: number,
) {
  const { scene, index, local } = sceneAtTime(project, time);
  const progress = Math.min(1, local / Math.max(0.001, scene.durationSec));
  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, width, height);
  const image = frames[index];
  if (image) {
    coverDraw(ctx, image, width, height, progress, index % 2 === 1);
  } else {
    titleCard(ctx, scene, width, height);
  }
  caption(ctx, scene.narration, width, height);

  if (hostImage) {
    const buffer = audioBuffers[index];
    const energy = buffer
      ? bufferEnergy(buffer, local)
      : fakeVoiceEnergy(time);
    drawAvatar(ctx, hostImage, width, height, project.avatarMode, project.aspect, energy);
  }
}

export function downloadBlob(blob: Blob, title: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(title)}.webm`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function shareOrDownload(blob: Blob, title: string) {
  const name = `${slug(title)}.webm`;
  const file = new File([blob], name, { type: blob.type || "video/webm" });
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
  };
  if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title, text: title });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }
  downloadBlob(blob, title);
}

