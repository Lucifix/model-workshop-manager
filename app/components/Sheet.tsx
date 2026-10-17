import { useEffect, useId, type PropsWithChildren } from "react";
import { CloseIcon } from "./icons";

/**
 * Modal panel: a centred dialog from `sm` up, a full-height sheet on phones.
 * A plain fixed overlay rather than <dialog showModal()> on purpose — the
 * top layer would sit above sonner's toasts, which flows inside the sheet
 * (e.g. "Save & add another") rely on. z-40 keeps it above BottomNav (z-20/30)
 * and below PhotoPicker's drawer (z-50), which opens from inside it.
 */
export function Sheet({
  title,
  onClose,
  children,
}: PropsWithChildren<{ title: string; onClose: () => void }>) {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // A nested overlay (PhotoPicker drawer) or an open combobox list handles
      // its own Escape and calls preventDefault; don't close the sheet too.
      if (e.key === "Escape" && !e.defaultPrevented) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-[100dvh] w-full flex-col bg-workshop-panel shadow-lift animate-fade-up sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-workshop-border"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-workshop-border px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-5 sm:pt-4">
          <h2 id={titleId} className="text-base font-semibold text-slate-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-100"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
