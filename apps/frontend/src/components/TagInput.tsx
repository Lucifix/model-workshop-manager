import { useMemo, useState } from "react";
import { useTags } from "../api/client";
import { Badge, Input } from "./ui";

export function TagInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const { data: allTags } = useTags();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const names = (allTags ?? []).map((t) => t.name).filter((n) => !value.includes(n));
    if (!q) return names.slice(0, 8);
    return names.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
  }, [allTags, query, value]);

  const addTag = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setQuery("");
    setOpen(false);
  };

  const removeTag = (name: string) => onChange(value.filter((t) => t !== name));

  const exactMatch = suggestions.some((n) => n.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="relative">
      {value.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {value.map((name) => (
            <Badge key={name} variant="secondary">
              {name}
              <button
                type="button"
                onClick={() => removeTag(name)}
                className="ml-1 text-slate-400 hover:text-red-400"
                aria-label={`Remove tag ${name}`}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && query.trim()) {
            e.preventDefault();
            addTag(query);
          }
        }}
        placeholder="Add tags — Gunpla, diorama, 40k…"
      />
      {open && query.trim() && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-workshop-border bg-workshop-panel shadow-lift">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(name)}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-workshop-panelmuted"
            >
              {name}
            </button>
          ))}
          {!exactMatch && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(query)}
              className="block w-full px-3 py-2 text-left text-sm text-workshop-accent hover:bg-workshop-panelmuted"
            >
              + Create "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
