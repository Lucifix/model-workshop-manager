import { useState } from "react";
import { useModels } from "../api/client";
import { Card, LoadingState, ErrorState, EmptyState, Badge } from "../components/ui";

export default function Models() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useModels(search);

  return (
    <div className="flex flex-col gap-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search models (name or kit number)…"
        className="rounded-lg border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
      />

      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Could not load models." />}
      {data && data.length === 0 && <EmptyState message="No models yet — add your first kit." />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data?.map((row) => (
          <Card key={row.model.id} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-100">{row.model.name}</span>
                {row.model.scale && <Badge>{row.model.scale}</Badge>}
              </div>
              <div className="text-xs text-slate-400">
                {row.manufacturer?.name} · {row.model.kitNumber}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
