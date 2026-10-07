import type { Project } from "./types";

export const DEMO_PROJECT: Project = {
  id: "demo-first-sheet",
  title: "The First Sheet",
  logline:
    "A short film about the invention that made memory light enough to carry.",
  prompt: "A quiet film about the invention of paper",
  look: "cinema",
  length: "featurette",
  aspect: "16:9",
  voiceId: "device",
  avatarId: "eve",
  avatarMode: "inset",
  scenes: [
    {
      id: "demo-1",
      title: "Stone and silk",
      narration:
        "Before paper, stories lived on stone and silk — heavy, precious, and slow to travel.",
      visualPrompt: "Han dynasty courtyard workshop at dusk",
      durationSec: 6.4,
      imageUrl: "/samples/sheet-1.jpg",
      status: "ready",
    },
    {
      id: "demo-2",
      title: "The mould",
      narration:
        "In a Han workshop, soaked fibers were lifted on a bamboo screen, water falling away like rain.",
      visualPrompt: "Wet pulp on a bamboo mould, lantern light",
      durationSec: 6.8,
      imageUrl: "/samples/sheet-2.jpg",
      status: "ready",
    },
    {
      id: "demo-3",
      title: "Courtyard wind",
      narration:
        "Each sheet dried in the courtyard wind, becoming light enough to carry a whole library.",
      visualPrompt: "Paper sheets drying on a courtyard line",
      durationSec: 5.8,
      imageUrl: "/samples/sheet-3.jpg",
      status: "ready",
    },
    {
      id: "demo-4",
      title: "Still holding",
      narration:
        "Two thousand years later, that quiet invention still holds every film, letter, and law we keep.",
      visualPrompt: "A blank ancient sheet in a modern archive",
      durationSec: 6.6,
      imageUrl: "/samples/sheet-4.jpg",
      status: "ready",
    },
  ],
};

export const SPARKS = [
  "How black holes bend time",
  "The forty-second history of espresso",
  "Why Roman concrete still stands",
  "A quiet film about migrating arctic terns",
];
