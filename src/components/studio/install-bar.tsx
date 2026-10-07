import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
};

export function InstallBar() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const nav = navigator as Navigator & { standalone?: boolean };
    setStandalone(media.matches || Boolean(nav.standalone));
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (standalone) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="min-h-11"
        onClick={() => {
          if (installEvent) {
            void installEvent.prompt();
            return;
          }
          setHint(true);
        }}
      >
        <Download />
        Install app
      </Button>
      {hint ? (
        <p className="max-w-40 text-xs text-subtle">
          Chrome menu, then Add to Home screen.
        </p>
      ) : null}
    </div>
  );
}
