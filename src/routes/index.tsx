import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { warmupVoices } from "@/lib/video/speech";
import { useStudio } from "@/lib/video/store";
import { Monitor } from "@/components/studio/monitor";
import { ComposePanel } from "@/components/studio/compose-panel";
import { ScriptPanel } from "@/components/studio/script-panel";
import { ProducePanel } from "@/components/studio/produce-panel";
import { StudioPanel } from "@/components/studio/studio-panel";
import { InstallBar } from "@/components/studio/install-bar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const stage = useStudio((s) => s.stage);
  const writingNote = useStudio((s) => s.writingNote);
  const reset = useStudio((s) => s.reset);
  const project = useStudio((s) => s.project);

  useEffect(() => {
    warmupVoices();
  }, []);

  return (
    <main className="min-h-dvh bg-bg text-fg">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 md:px-6">
        <div>
          <p className="font-display text-xl italic tracking-tight">Lumen</p>
          <p className="text-xs text-muted">Token-free video on this phone</p>
        </div>
        {stage !== "compose" ? (
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            New film
          </Button>
        ) : (
          <InstallBar />
        )}
      </header>

      <div className="mx-auto flex min-w-0 max-w-6xl flex-col gap-8 px-4 pb-28 md:px-6">
        {stage === "compose" ? (
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-medium leading-tight tracking-tight md:text-5xl">
              A film from a sentence. No tokens.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted md:text-base">
              Write a brief. Lumen cuts scenes on the phone, casts a host, and
              speaks the voice-over. Add your photos and mic takes, then save the
              cut. Install it to the home screen like an app.
            </p>
          </div>
        ) : null}

        <Monitor />

        {stage === "compose" ? <ComposePanel /> : null}
        {stage === "writing" ? (
          <p className="mx-auto w-full max-w-4xl text-sm text-muted">
            {writingNote}
            {project?.title ? ` · ${project.title}` : ""}
          </p>
        ) : null}
        {stage === "script" ? <ScriptPanel /> : null}
        {stage === "producing" ? <ProducePanel /> : null}
        {stage === "studio" ? <StudioPanel /> : null}
      </div>
    </main>
  );
}
