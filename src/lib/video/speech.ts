export type DeviceVoice = {
  uri: string;
  name: string;
  lang: string;
};

function allVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

export function listDeviceVoices(): DeviceVoice[] {
  return allVoices()
  .filter((voice) => voice.name && voice.voiceURI)
  .sort((a, b) => {
    const aHindi = a.lang.toLowerCase().startsWith("hi");
    const bHindi = b.lang.toLowerCase().startsWith("hi");
    return Number(bHindi) - Number(aHindi);
  })
  .slice(0, 30)
  .map((voice) => ({
      uri: voice.voiceURI,
      name: voice.name.replace(/^Google\s+/i, "").split(" - ")[0] ?? voice.name,
      lang: voice.lang,
    }));
}

function pickVoice(uri?: string) {
  const voices = allVoices();
  if (uri) {
    const match = voices.find((voice) => voice.voiceURI === uri);
    if (match) return match;
  }
  return (
  voices.find((voice) =>
    voice.lang.toLowerCase().startsWith("hi"),
  ) ??
  voices.find(
    (voice) =>
      voice.lang.toLowerCase().startsWith("en") &&
      /google|samantha|daniel|karen|moira|female/i.test(voice.name),
  ) ??
  voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
  voices[0] ??
  null
);
}

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking() {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
}

export function speakLine(
  text: string,
  onEnd?: () => void,
  voiceURI?: string,
): { stop: () => void } {
  if (!canSpeak() || !text.trim()) {
    onEnd?.();
    return { stop: () => undefined };
  }

  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.rate = 0.96;
  utterance.pitch = 1;
  const voice = pickVoice(voiceURI);
  if (voice) utterance.voice = voice;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
  return { stop: () => stopSpeaking() };
}

export function warmupVoices() {
  if (!canSpeak()) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}

export function voiceUriFromId(id: string) {
  return id.startsWith("dev:") ? id.slice(4) : undefined;
}
