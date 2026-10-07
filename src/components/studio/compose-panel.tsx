import { Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SPARKS } from "@/lib/video/demo";
import { ASPECTS, LENGTHS, LOOKS } from "@/lib/video/types";
import { useStudio } from "@/lib/video/store";
import { cn } from "@/lib/utils";
import { CastPanel } from "./cast-panel";

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 rounded-sm px-3 text-sm transition-colors duration-150",
        active
          ? "bg-accent text-accent-fg"
          : "bg-elevated text-muted shadow-[var(--shadow-border)] hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

export function ComposePanel() {
  const brief = useStudio((s) => s.brief);
  const setBrief = useStudio((s) => s.setBrief);
  const writeScript = useStudio((s) => s.writeScript);
  const error = useStudio((s) => s.error);
  const loadDemo = useStudio((s) => s.loadDemo);
  const ready = brief.prompt.trim().length >= 8;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-5">
      <div>
        <label htmlFor="brief" className="mb-2 block text-sm font-medium text-muted">
          Brief
        </label>
        <Textarea
          id="brief"
          value={brief.prompt}
          onChange={(e) => setBrief({ prompt: e.target.value })}
          placeholder="A short film about how glass is made, told like a nature essay."
          maxLength={600}
          enterKeyHint="done"
        />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-medium text-muted">Look</legend>
          <div className="flex flex-wrap gap-2">
            {LOOKS.map((look) => (
              <Chip
                key={look.id}
                active={brief.look === look.id}
                onClick={() => setBrief({ look: look.id })}
              >
                {look.label}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-medium text-muted">Length</legend>
          <div className="flex flex-wrap gap-2">
            {LENGTHS.map((length) => (
              <Chip
                key={length.id}
                active={brief.length === length.id}
                onClick={() => setBrief({ length: length.id })}
              >
                {length.label}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset className="min-w-0 sm:col-span-2">
          <legend className="mb-2 text-sm font-medium text-muted">Frame</legend>
          <div className="flex flex-wrap gap-2">
            {ASPECTS.map((aspect) => (
              <Chip
                key={aspect.id}
                active={brief.aspect === aspect.id}
                onClick={() => setBrief({ aspect: aspect.id })}
              >
                {aspect.label}
              </Chip>
            ))}
          </div>
        </fieldset>
      </div>

      <CastPanel />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-subtle">
          Try a brief
        </p>
        <div className="flex flex-wrap gap-2">
          {SPARKS.map((spark) => (
            <button
              key={spark}
              type="button"
              className="min-h-11 rounded-sm px-3 py-2 text-left text-sm text-muted shadow-[var(--shadow-border)] hover:text-fg"
              onClick={() => setBrief({ prompt: spark })}
            >
              {spark}
            </button>
          ))}
        </div>
      </div>

      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl bg-bg/95 p-3 shadow-[var(--shadow-border)] backdrop-blur-sm md:static md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
        <Button
          type="button"
          id="direct-film"
          onClick={() => {
            void writeScript();
          }}
          disabled={!ready}
          className="w-full sm:w-auto"
        >
          <Clapperboard />
          Direct this film
        </Button>
        <Button type="button" variant="ghost" onClick={loadDemo} className="w-full sm:w-auto">
          Watch the sample cut
        </Button>
      </div>
    </div>
  );
}
