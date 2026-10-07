import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-28 w-full resize-y rounded-md bg-elevated px-3.5 py-3 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40",
        className,
      )}
      suppressHydrationWarning
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
