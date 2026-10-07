function pickMime() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const type of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

type ActiveTake = {
  recorder: MediaRecorder;
  chunks: BlobPart[];
  stream: MediaStream;
};

let active: ActiveTake | null = null;

export function isRecording() {
  return Boolean(active);
}

export async function startTake() {
  if (active) await cancelTake();
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("This phone cannot record audio here.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMime();
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  recorder.start();
  active = { recorder, chunks, stream };
}

export async function stopTake() {
  const take = active;
  if (!take) throw new Error("No take in progress");
  const blob = await new Promise<Blob>((resolve, reject) => {
    take.recorder.onerror = () => reject(new Error("Could not keep that take"));
    take.recorder.onstop = () => {
      resolve(new Blob(take.chunks, { type: take.recorder.mimeType || "audio/webm" }));
    };
    if (take.recorder.state !== "inactive") take.recorder.stop();
    else resolve(new Blob(take.chunks, { type: take.recorder.mimeType || "audio/webm" }));
  });
  take.stream.getTracks().forEach((track) => track.stop());
  active = null;
  if (!blob.size) throw new Error("That take was silent. Try again.");
  const url = URL.createObjectURL(blob);
  const durationSec = await measureAudioDuration(url);
  return { url, durationSec };
}

export async function cancelTake() {
  if (!active) return;
  try {
    if (active.recorder.state !== "inactive") active.recorder.stop();
  } catch {
    /* already stopped */
  }
  active.stream.getTracks().forEach((track) => track.stop());
  active = null;
}

function measureAudioDuration(url: string) {
  return new Promise<number>((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      resolve(duration || 0);
    };
    audio.onerror = () => resolve(0);
    audio.src = url;
  });
}
