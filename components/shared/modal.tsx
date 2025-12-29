import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose?: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10 backdrop-blur-sm">
      <div
        className={cn(
          "relative w-full max-h-[90vh] overflow-y-auto rounded-3xl border border-border/80 bg-surface p-6 shadow-2xl",
          wide ? "max-w-3xl" : "max-w-xl",
        )}
      >
        {onClose ? (
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-surface-strong px-3 py-1 text-xs text-muted hover:bg-foreground/10"
            aria-label="Закрыть"
          >
            Esc
          </button>
        ) : null}
        <div className="space-y-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">MEMORY</p>
            <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted">{description}</p>
            ) : null}
          </div>
          <div className="mt-4 space-y-4">{children}</div>
        </div>
        {footer ? <div className="mt-6 flex flex-wrap gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}
