import { useCallback, useEffect } from "react";

export interface LightboxPhoto {
  id: number;
  url: string;
  caption?: string;
}

export function Lightbox({
  photos,
  index,
  onClose,
  onIndexChange,
  isCover,
  onSetCover,
  onDelete,
}: {
  photos: LightboxPhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  isCover?: (photo: LightboxPhoto) => boolean;
  onSetCover?: (photo: LightboxPhoto) => void;
  onDelete?: (photo: LightboxPhoto) => void;
}) {
  const photo = photos[index];

  const goPrev = useCallback(
    () => onIndexChange((index - 1 + photos.length) % photos.length),
    [index, photos.length, onIndexChange]
  );
  const goNext = useCallback(() => onIndexChange((index + 1) % photos.length), [index, photos.length, onIndexChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && photos.length > 1) goPrev();
      if (e.key === "ArrowRight" && photos.length > 1) goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, goPrev, goNext, photos.length]);

  if (!photo) return null;
  const covered = isCover?.(photo) ?? false;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-2xl leading-none text-slate-200 hover:bg-black/70"
        aria-label="Close"
      >
        ×
      </button>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-xl text-slate-200 hover:bg-black/70 sm:left-4"
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-xl text-slate-200 hover:bg-black/70 sm:right-4"
            aria-label="Next photo"
          >
            ›
          </button>
        </>
      )}

      <div className="flex max-h-full max-w-full flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <img
          src={photo.url}
          alt={photo.caption || "Build photo"}
          className="max-h-[75vh] max-w-[90vw] rounded-lg object-contain shadow-lift"
        />
        <div className="flex w-full flex-wrap items-center justify-center gap-3 text-sm text-slate-300">
          {photo.caption && <span>{photo.caption}</span>}
          {photos.length > 1 && (
            <span className="text-xs text-slate-500">
              {index + 1} / {photos.length}
            </span>
          )}
          {onSetCover && (
            <button
              type="button"
              onClick={() => onSetCover(photo)}
              className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
                covered
                  ? "border-workshop-accent text-workshop-accent"
                  : "border-workshop-border text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              {covered ? "★ Cover photo" : "☆ Set as cover"}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(photo)}
              className="rounded-lg border border-workshop-border px-3 py-1 text-xs font-medium text-slate-300 hover:border-red-500/60 hover:text-red-400"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
