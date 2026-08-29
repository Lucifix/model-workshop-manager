import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LoadingState, ErrorState, EmptyState, Badge, PageHeader, Button, Select } from "../components/ui";
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

export default function PaintInventory() {
  const navigate = useNavigate();
  const [fillLevelFilter, setFillLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["inventory", "paints", fillLevelFilter, statusFilter],
    queryFn: () => fetchPaintInventory(fillLevelFilter || undefined, statusFilter || undefined),
  });

  const getLowStockTone = (fillLevel: string): "warn" | "ok" | "neutral" => {
    if (fillLevel === "Empty" || fillLevel === "Low") return "warn";
    return "neutral";
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="My Paint Inventory"
        description={data && data.length > 0 ? `${data.length} paint${data.length === 1 ? "" : "s"} on the shelf.` : "Paints you have on the shelf."}
        actions={<Button onClick={() => navigate("/paints")}>+ Add paints</Button>}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={fillLevelFilter} onChange={(e) => setFillLevelFilter(e.target.value)} className="sm:w-56">
          <option value="">All fill levels</option>
          {FILL_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-56">
          <option value="">All status</option>
          <option value="in_stock">In stock</option>
          <option value="empty">Empty</option>
          <option value="discontinued">Discontinued</option>
        </Select>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Could not load your paint inventory." />}
      {data && data.length === 0 && <EmptyState message="You haven't added any paints yet. Click 'Add paints' to get started!" />}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {data?.map((row) => (
          <div
            key={row.inventory.id}
            onClick={() => navigate(`/paints/${row.inventory.paintId}`)}
            className="group cursor-pointer overflow-hidden rounded-2xl border border-workshop-border bg-workshop-panel shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-workshop-accent/50 hover:shadow-lift"
          >
            <div
              className="relative flex h-20 items-end p-2"
              style={{ backgroundColor: row.paint?.colorHex ?? "#334155" }}
            >
              <Badge variant="secondary" tone={getLowStockTone(row.inventory.fillLevel)}>
                {row.inventory.quantity}x {row.inventory.fillLevel}
              </Badge>
            </div>
            <div className="p-3">
              <h3 className="mb-1 truncate text-sm font-semibold text-slate-100">{row.paint?.name || "Unknown paint"}</h3>
              <div className="truncate text-xs text-slate-400">
                {row.paint?.productCode} · {row.paint?.type}
                {row.paint?.finish ? ` · ${row.paint.finish}` : ""}
              </div>
              {row.inventory.storageLocation && (
                <div className="mt-1.5 truncate text-xs text-slate-500">📍 {row.inventory.storageLocation}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
