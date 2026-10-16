import { useId, useMemo, useState, type ReactNode } from "react";
import { Input } from "./ui";

/**
 * Pick-or-type text field: a plain input whose value is free text, with a
 * filtered suggestion list underneath. Used instead of <datalist> because
 * that hides every option once the field has a value (so "change the scale"
 * means clearing it first) and can't show an inline "Add …" row.
 */
export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  createLabel,
  normalize,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  /** Shown as the last row when the typed text matches no option, e.g.
   * (q) => `Add "${q}"`. Omit to just keep the typed text as the value. */
  createLabel?: (query: string) => ReactNode;
  /** Applied to typed (not picked) text when the field loses focus. */
  normalize?: (value: string) => string;
  ariaLabel?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Filter by what the user has typed since focusing, not by the current
  // value — otherwise a prefilled "1:48" would hide every other scale.
  const [query, setQuery] = useState<string | null>(null);

  const q = (query ?? "").trim().toLowerCase();
  const matches = useMemo(
    () => (q ? options.filter((o) => o.toLowerCase().includes(q)) : [...options]).slice(0, 50),
    [options, q],
  );
  const exact = options.some((o) => o.toLowerCase() === q);
  const showCreate = Boolean(createLabel && q && !exact);
  const rowCount = matches.length + (showCreate ? 1 : 0);

  const choose = (next: string) => {
    onChange(next);
    setQuery(null);
    setOpen(false);
    setActive(-1);
  };

  const commitTyped = () => {
    if (normalize && query !== null) {
      const normalized = normalize(value);
      if (normalized !== value) {
        onChange(normalized);
      }
    }
    setQuery(null);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open && rowCount > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={commitTyped}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            const delta = e.key === "ArrowDown" ? 1 : -1;
            setActive((i) => (rowCount === 0 ? -1 : (i + delta + rowCount) % rowCount));
          } else if (e.key === "Enter" && open && active >= 0) {
            e.preventDefault();
            choose(active < matches.length ? matches[active]! : (query ?? "").trim());
          } else if (e.key === "Escape" && open) {
            e.preventDefault();
            setOpen(false);
          }
        }}
      />
      {open && rowCount > 0 && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-workshop-border bg-workshop-panel shadow-lift"
        >
          {matches.map((option, i) => (
            <div
              key={option}
              role="option"
              aria-selected={option === value}
              // mousedown, not click: fires before the input's blur closes the list.
              onMouseDown={(e) => {
                e.preventDefault();
                choose(option);
              }}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === active ? "bg-workshop-panelmuted" : "hover:bg-workshop-panelmuted"
              } ${option === value ? "font-semibold text-slate-100" : "text-slate-300"}`}
            >
              {option}
            </div>
          ))}
          {showCreate && (
            <div
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                choose((query ?? "").trim());
              }}
              className={`cursor-pointer px-3 py-2 text-sm text-workshop-accent ${
                active === matches.length
                  ? "bg-workshop-panelmuted"
                  : "hover:bg-workshop-panelmuted"
              }`}
            >
              {createLabel!((query ?? "").trim())}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
