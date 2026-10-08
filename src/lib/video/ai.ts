```ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  lookById,
  type AspectId,
  type LengthId,
  type LookId,
  type Scene,
} from "./types";

const CHAT_MODEL = "grok-4.5";
const IMAGE_MODEL = "grok-imagine-image-2.0";
const MAX_NARRATION = 1200;
const MAX_VISUAL = 500;

function apiKey() {
  return process.env.XAI_API_KEY?.trim() || "";
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey()}`,
  };
}

function bytesToDataUrl(bytes: ArrayBuffer, mime: string) {
  const b64 = Buffer.from(bytes).toString("base64");
  return `data:${mime};base64,${b64}`;
}

function extractJson(text: string) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("The director returned no script");
  }

  return JSON.parse(raw.slice(start, end + 1)) as unknown;
}

const ScriptScene = z.object({
  title: z.string().min(1).max(80),
  narration: z.string().min(1).max(1200),
  visualPrompt: z.string().min(1).max(1200),
  durationSec: z.number().min(3).max(45).optional(),
});

const ScriptBody = z.object({
  title: z.string().min(1).max(80),
  logline: z.string().min(1).max(240),
  scenes: z.array(ScriptScene).min(3).max(24),
});

const BriefInput = z.object({
  prompt: z.string().trim().min(8).max(600),
  look: z.enum(["cinema", "editorial", "essay", "graphic", "story"]),
  length: z.enum(["short", "featurette", "reel", "five", "ten"]),
  aspect: z.enum(["16:9", "9:16", "1:1"]),
  voiceId: z.string().min(1).max(40),
});

const ReviseInput = z.object({
  note: z.string().trim().min(4).max(400),
  look: z.enum(["cinema", "editorial", "essay", "graphic", "story"]),
  aspect: z.enum(["16:9", "9:16", "1:1"]),
  script: z.object({
    title: z.string(),
    logline: z.string(),
    scenes: z.array(ScriptScene),
  }),
});

const ImageInput = z.object({
  visualPrompt: z.string().min(4).max(1200),
  look: z.enum(["cinema", "editorial", "essay", "graphic", "story"]),
  aspect: z.enum(["16:9", "9:16", "1:1"]),
});

const VoiceInput = z.object({
  text: z.string().trim().min(1).max(1200),
  voiceId: z.string().min(1).max(40),
});

function aspectHint(aspect: AspectId) {
  if (aspect === "9:16") {
    return "vertical 9:16 portrait composition, full-frame still";
  }

  if (aspect === "1:1") {
    return "square 1:1 centered composition";
  }

  return "widescreen 16:9 cinematic composition";
}

function wordDuration(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(45, Math.max(4.5, words / 2.4 + 0.7));
}

function toScenes(
  parsed: z.infer<typeof ScriptBody>,
  look: LookId,
  aspect: AspectId,
): {
  title: string;
  logline: string;
  scenes: Omit<Scene, "status">[];
} {
  const lookSuffix = lookById(look).suffix;

  return {
    title: parsed.title.trim(),
    logline: parsed.logline.trim(),

    scenes: parsed.scenes.map((scene, index) => ({
      id:
        globalThis.crypto?.randomUUID?.() ??
        `scene-${Date.now()}-${index}`,

      title: scene.title.trim().slice(0, 48),

      narration: scene.narration
        .trim()
        .slice(0, MAX_NARRATION),

      visualPrompt: `${scene.visualPrompt
        .trim()
        .slice(0, MAX_VISUAL)}. ${aspectHint(aspect)}. ${lookSuffix}`,

      durationSec: wordDuration(scene.narration),
    })),
  };
}

function directorPrompt(input: z.infer<typeof BriefInput>) {
  const scenes =
    input.length === "short"
      ? 3
      : input.length === "featurette"
        ? 5
        : input.length === "reel"
          ? 6
          : input.length === "five"
            ? 12
            : 24;

  const seconds =
    input.length === "short"
      ? 20
      : input.length === "featurette"
        ? 35
        : input.length === "reel"
          ? 50
          : input.length === "five"
            ? 300
            : 600;

  return `You are Lumen, a film director making a short voice-over film from a brief.

Return ONLY valid JSON:

{
  "title": string,
  "logline": string,
  "scenes": [
    {
      "title": string,
      "narration": string,
      "visualPrompt": string,
      "durationSec": number
    }
  ]
}

Rules:

- Exactly ${scenes} scenes.
- Spoken length should fit about ${seconds} seconds total.
- Narration is what a voice actor says, not a description of the picture.
- visualPrompt describes a SINGLE still image.
- No on-screen text, letters, captions, subtitles, logos, watermarks, or famous real people.
- Look: ${input.look}.
- Frame: ${input.aspect}.
- Brief: ${input.prompt}`;
}

async function chatJson(
  user: string,
  model = CHAT_MODEL,
  retried = false,
): Promise<z.infer<typeof ScriptBody>> {
  const key = apiKey();

  if (!key) {
    throw new Error("AI is not available in this environment");
  }

  const res = await fetch(
    "https://api.x.ai/v1/chat/completions",
    {
      method: "POST",
      headers: headers(),

      body: JSON.stringify({
        model,
        temperature: 0.8,
        max_tokens: 5000,
        response_format: {
          type: "json_object",
        },

        messages: [
          {
            role: "system",
            content:
              "You write short voice-over films as compact JSON. Never wrap JSON in markdown.",
          },

          {
            role: "user",
            content: user,
          },
        ],
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");

    if (
      !retried &&
      (res.status === 404 || /model/i.test(errText))
    ) {
      return chatJson(user, "grok-4", true);
    }

    throw new Error(
      res.status === 429
        ? "The studio is busy. Try again in a moment."
        : "The director couldn't draft that cut. Try a shorter brief.",
    );
  }

  const body = (await res.json()) as {
    choices?: {
      message?: {
        content?: string;
      };
    }[];
  };

  const text =
    body.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = ScriptBody.safeParse(
      extractJson(text),
    );

    if (!parsed.success) {
      if (!retried) {
        return chatJson(
          `${user}

Your previous reply was not valid JSON.
Reply with the JSON object only.`,
          model,
          true,
        );
      }

      throw new Error(
        "Couldn't draft that cut. Try a shorter brief.",
      );
    }

    return parsed.data;
  } catch (err) {
    if (
      !retried &&
      !(
        err instanceof Error &&
        err.message.startsWith("Couldn't")
      )
    ) {
      return chatJson(
        `${user}

Your previous reply was not valid JSON.
Reply with the JSON object only.`,
        model,
        true,
      );
    }

    throw err instanceof Error
      ? err
      : new Error("Couldn't draft that cut.");
  }
}

export const getAiStatus = createServerFn({
  method: "POST",
}).handler(async () => {
  return {
    available: Boolean(apiKey()),
  };
});

export const generateScript = createServerFn({
  method: "POST",
})
  .validator((data) => BriefInput.parse(data))
  .handler(async ({ data }) => {
    const parsed = await chatJson(
      directorPrompt(data),
    );

    const {
      title,
      logline,
      scenes,
    } = toScenes(
      parsed,
      data.look,
      data.aspect,
    );

    return {
      ok: true as const,

      project: {
        id:
          globalThis.crypto?.randomUUID?.() ??
          `film-${Date.now()}`,

        title,
        logline,
        prompt: data.prompt,

        look: data.look as LookId,
        length: data.length as LengthId,
        aspect: data.aspect as AspectId,

        voiceId: data.voiceId,

        avatarId: "none",

        avatarMode: "inset" as const,

        scenes: scenes.map((scene) => ({
          ...scene,
          status: "idle" as const,
        })),
      },
    };
  });

export const reviseScript = createServerFn({
  method: "POST",
})
  .validator((data) => ReviseInput.parse(data))
  .handler(async ({ data }) => {
    const parsed = await chatJson(
      `Revise this voice-over film JSON according to the director note.

Keep the same number of scenes unless the note asks otherwise.

No on-screen text in visualPrompt.

JSON only.

Note:
${data.note}

Look:
${data.look}

Frame:
${data.aspect}

Current:
${JSON.stringify(data.script)}`,
    );

    const next = toScenes(
      parsed,
      data.look,
      data.aspect,
    );

    return {
      ok: true as const,

      title: next.title,
      logline: next.logline,

      scenes: next.scenes.map((scene) => ({
        ...scene,
        status: "idle" as const,
      })),
    };
  });

export const generateSceneImage = createServerFn({
  method: "POST",
})
  .validator((data) => ImageInput.parse(data))
  .handler(async ({ data }) => {
    if (!apiKey()) {
      return {
        ok: false as const,
        error: "AI is not available",
      };
    }

    const prompt =
      `${data.visualPrompt}. ` +
      `${aspectHint(data.aspect)}. ` +
      `${lookById(data.look).suffix}`;

    const res = await fetch(
      "https://api.x.ai/v1/images/generations",
      {
        method: "POST",
        headers: headers(),

        body: JSON.stringify({
          model: IMAGE_MODEL,
          prompt: prompt.slice(0, 1200),
          n: 1,
        }),
      },
    );

    if (!res.ok) {
      const errText =
        await res.text().catch(() => "");

      return {
        ok: false as const,

        error:
          res.status === 429
            ? "Image studio is busy"
            : `Could not shoot this frame (${res.status})${
                errText
                  ? `: ${errText.slice(0, 140)}`
                  : ""
              }`,
      };
    }

    const body = (await res.json()) as {
      data?: {
        url?: string;
        b64_json?: string;
        mime_type?: string;
      }[];
    };

    const item = body.data?.[0];

    if (item?.b64_json) {
      const mime =
        item.mime_type || "image/jpeg";

      return {
        ok: true as const,

        imageUrl:
          `data:${mime};base64,${item.b64_json}`,
      };
    }

    if (!item?.url) {
      return {
        ok: false as const,
        error: "No frame returned",
      };
    }

    const imgRes = await fetch(item.url);

    if (!imgRes.ok) {
      return {
        ok: false as const,
        error: "Could not fetch the frame",
      };
    }

    const mime =
      imgRes.headers.get("content-type") ||
      "image/jpeg";

    const imageUrl = bytesToDataUrl(
      await imgRes.arrayBuffer(),
      mime,
    );

    return {
      ok: true as const,
      imageUrl,
    };
  });

export const generateSceneVoice = createServerFn({
  method: "POST",
})
  .validator((data) => VoiceInput.parse(data))
  .handler(async ({ data }) => {
    if (!apiKey()) {
      return {
        ok: false as const,
        error: "AI is not available",
      };
    }

    if (data.voiceId === "device") {
      return {
        ok: false as const,
        error: "Device voice is local",
      };
    }

    const res = await fetch(
      "https://api.x.ai/v1/tts",
      {
        method: "POST",
        headers: headers(),

        body: JSON.stringify({
          text: data.text.slice(0, MAX_NARRATION),
          voice_id: data.voiceId,

          // Keep current behavior for now.
          // Hindi/multilingual voice support will be added
          // in the next voice-system update.
          language: "en",
        }),
      },
    );

    const type =
      res.headers.get("content-type") || "";

    if (!res.ok) {
      const errText =
        await res.text().catch(() => "");

      return {
        ok: false as const,

        error:
          res.status === 429
            ? "Voice studio is busy"
            : `Could not record voice (${res.status})${
                errText
                  ? `: ${errText.slice(0, 140)}`
                  : ""
              }`,
      };
    }

    if (type.includes("application/json")) {
      const json = (await res.json()) as {
        audio?: string;
        content_type?: string;
        duration?: number;
      };

      if (!json.audio) {
        return {
          ok: false as const,
          error: "No audio returned",
        };
      }

      const mime =
        json.content_type || "audio/mpeg";

      return {
        ok: true as const,

        audioUrl:
          `data:${mime};base64,${json.audio}`,

        durationSec: json.duration,
      };
    }

    const mime =
      type || "audio/mpeg";

    const audioUrl = bytesToDataUrl(
      await res.arrayBuffer(),
      mime,
    );

    return {
      ok: true as const,
      audioUrl,
    };
  });
```
