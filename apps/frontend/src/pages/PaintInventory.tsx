import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, LoadingState, ErrorState, EmptyState, Badge } from "../components/ui";
import { useState } from "react";

interface PaintInventoryRow {
  inventory: {
    id: number;
    paintId: number;
    quantity: number;
    fillLevel: string;
    status: string;
    storageLocation?: string;
    notes?: string;
  };
  paint: {
    id: number;
    productCode: string;
    name: string;
    type: string;
    finish?: string;
    colorHex?: string;
  } | null;
}

async function fetchPaintInventory(fillLevel?: string, status?: string): Promise<PaintInventoryRow[]> {
  const params = new URLSearchParams();
  if (fillLevel) params.append("fillLevel", fillLevel);
  if (status) params.append("status", status);
  const res = await fetch(`/api/inventory/paints${params.toString() ? `?${params}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch paint inventory");
  return res.json();
}

const FILL_LEVELS = ["Full", "Mostly Full", "Half", "Low", "Empty"];
const STATUS_OPTIONS = ["in_stock", "empty", "discontinued"];

export default function PaintInventory() {
  const navigate = useNavigate();
  const [fillLevelFilter, setFillLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["inventory", "paints", fillLevelFilter, statusFilter],
    queryFn: () => fetchPaintInventory(fillLevelFilter || undefined, statusFilter || undefined),
  });

  const getLowStockColor = (fillLevel: string) => {
    if (fillLevel === "Empty") return "bg-red-500/15 text-red-400";
    if (fillLevel === "Low") return "bg-amber-500/15 text-amber-400";
    return "bg-emerald-500/15 text-emerald-400";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">My Paint Collection</h1>
        <button
          onClick={() => navigate("/paints")}
          className="rounded bg-workshop-accent px-4 py-2 text-sm font-medium text-white hover:bg-workshop-accent/90"
        >
          Add paints
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={fillLevelFilter}
          onChange={(e) => setFillLevelFilter(e.target.value)}
          className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
        >
          <option value="">All fill levels</option>
          {FILL_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
        >
          <option value="">All status</option>
          <option value="in_stock">In stock</option>
          <option value="empty">Empty</option>
          <option value="discontinued">Discontinued</option>
        </select>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Could not load your paint inventory." />}
      {data && data.length === 0 && <EmptyState message="You haven't added any paints yet. Click 'Add paints' to get started!" />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data?.map((row) => (
          <Card
            key={row.inventory.id}
            className="cursor-pointer transition-all hover:border-workshop-accent hover:bg-slate-800"
            onClick={() => navigate(`/paints/${row.inventory.paintId}`)}
          >
            <div className="flex items-start gap-3">
              <span
                className="h-12 w-12 shrink-0 rounded border border-slate-600"
                style={{ backgroundColor: row.paint?.colorHex ?? "#334155" }}
              />
              <div className="flex-1">
                <h3 className="mb-1 font-semibold text-slate-100">{row.paint?.name || "Unknown paint"}</h3>
                <div className="mb-2 text-xs text-slate-400">
                  {row.paint?.productCode} · {row.paint?.type}
                  {row.paint?.finish ? ` · ${row.paint.finish}` : ""}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" tone={getLowStockColor(row.inventory.fillLevel).includes("bg-red") ? "warn" : "neutral"}>
                    {row.inventory.quantity}x {row.inventory.fillLevel}
                  </Badge>
                  {row.inventory.storageLocation && (
                    <Badge variant="secondary">📍 {row.inventory.storageLocation}</Badge>
                  )}
                </div>
              </div>
            </div>
            {row.inventory.notes && (
              <div className="mt-2 text-xs text-slate-500">
                Notes: {row.inventory.notes}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
