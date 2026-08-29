import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePaints } from "../api/client";
import { Card, LoadingState, ErrorState, EmptyState, Badge, PageHeader, Input } from "../components/ui";

export default function Paints() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = usePaints(search);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Paint Catalog" description="Every paint in the shared catalog." />

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search paints (name or product code)…"
      />

      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Could not load paints." />}
      {data && data.length === 0 && <EmptyState message="No paints yet — add your first one." />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data?.map((row) => (
          <Card
            key={row.paint.id}
            className="flex cursor-pointer items-center gap-3 transition-all hover:border-workshop-accent hover:bg-slate-800/60"
            onClick={() => navigate(`/paints/${row.paint.id}`)}
          >
            <span
              className="h-9 w-9 shrink-0 rounded-full border border-workshop-border shadow-inner"
              style={{ backgroundColor: row.paint.colorHex ?? "#334155" }}
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-slate-100">{row.paint.name}</span>
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
