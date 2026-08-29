import { useState } from "react";
import { usePaints } from "../api/client";
import { Input } from "./ui";

export interface PickedPaint {
  id: number;
  name: string;
  productCode: string;
  colorHex?: string;
}

export function PaintPicker({
  onSelect,
  placeholder = "Search paints by name or code…",
}: {
  onSelect: (paint: PickedPaint) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isFetching } = usePaints(query, undefined, true);

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
      />
      {open && query.trim() && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-workshop-border bg-workshop-panel shadow-lift">
          {isFetching && <div className="px-3 py-2 text-xs text-slate-500">Searching…</div>}
          {!isFetching && data?.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-500">No matches.</div>
          )}
          {data?.slice(0, 20).map((row) => (
            <button
              key={row.paint.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(row.paint);
                setQuery("");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-workshop-panelmuted"
            >
              <span
                className="h-4 w-4 flex-shrink-0 rounded-full border border-workshop-border"
                style={{ backgroundColor: row.paint.colorHex ?? "#334155" }}
              />
              <span className="truncate">
                {row.paint.name} <span className="text-slate-500">({row.paint.productCode})</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
