import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePaints } from "../api/client";
import { Card, LoadingState, ErrorState, EmptyState, Badge } from "../components/ui";

export default function Paints() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = usePaints(search);

  return (
    <div className="flex flex-col gap-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search paints (name or product code)…"
        className="rounded-lg border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
      />

      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Could not load paints." />}
      {data && data.length === 0 && <EmptyState message="No paints yet — add your first one." />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data?.map((row) => (
          <Card
            key={row.paint.id}
            className="cursor-pointer transition-all hover:border-workshop-accent hover:bg-slate-800 flex items-center gap-3"
            onClick={() => navigate(`/paints/${row.paint.id}`)}
          >
            <span
              className="h-8 w-8 shrink-0 rounded-full border border-slate-700"
              style={{ backgroundColor: row.paint.colorHex ?? "#334155" }}
              aria-hidden
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-100">{row.paint.name}</span>
                <Badge>{row.paint.type}</Badge>
              </div>
              <div className="text-xs text-slate-400">
                {row.manufacturer?.name} · {row.paint.productCode}
                {row.paint.finish ? ` · ${row.paint.finish}` : ""}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
