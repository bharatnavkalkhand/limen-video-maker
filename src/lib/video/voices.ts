export type VoiceOption = {
  id: string;
  name: string;
  note: string;
  studio: boolean;
};

export const VOICES: VoiceOption[] = [
  { id: "device", name: "Phone", note: "Free voice on this device", studio: false },
  { id: "mic", name: "Your mic", note: "Record a take — in the download too", studio: false },
];

export const DEVICE_VOICE_ID = "device";
export const MIC_VOICE_ID = "mic";

export const VOICE_SAMPLE =
  "I'm ready when you are. Let's make a film worth keeping.";

export function voiceById(id: string): VoiceOption {
  if (id.startsWith("dev:")) {
    return { id, name: "Phone", note: "Free voice on this device", studio: false };
  }
  return VOICES.find((voice) => voice.id === id) ?? VOICES[0];
}

export function isStudioVoice(id: string) {
  return voiceById(id).studio;
}

export function isMicVoice(id: string) {
  return id === MIC_VOICE_ID;
}
