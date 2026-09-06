import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { CameraIcon, GalleryIcon } from "./icons";

function isTouchDevice() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

interface PhotoPickerProps {
  onSelect: (file: File) => void;
  disabled?: boolean;
  children: (open: () => void) => ReactNode;
}

export function PhotoPicker({ onSelect, disabled, children }: PhotoPickerProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    if (disabled) {
      return;
    }
    if (isTouchDevice()) {
      setDrawerOpen(true);
    } else {
      galleryInputRef.current?.click();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setDrawerOpen(false);
    if (file) {
      onSelect(file);
    }
  };

  return (
    <>
      {children(open)}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl border-t border-workshop-border bg-workshop-panel p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] animate-fade-up">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-workshop-border" />
            <p className="mb-3 text-sm font-medium text-slate-300">Add a photo</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl border border-workshop-border px-4 py-3 text-left text-sm font-medium text-slate-100 transition-colors hover:border-workshop-accent"
                onClick={() => cameraInputRef.current?.click()}
              >
                <CameraIcon className="h-5 w-5" /> Take Photo
              </button>
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl border border-workshop-border px-4 py-3 text-left text-sm font-medium text-slate-100 transition-colors hover:border-workshop-accent"
                onClick={() => galleryInputRef.current?.click()}
              >
                <GalleryIcon className="h-5 w-5" /> Choose from Gallery
              </button>
              <button
                type="button"
                className="mt-1 rounded-xl px-4 py-3 text-center text-sm font-medium text-slate-400 hover:text-slate-200"
                onClick={() => setDrawerOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
