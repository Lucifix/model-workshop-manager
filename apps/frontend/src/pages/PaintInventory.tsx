import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, LoadingState, ErrorState, EmptyState, Badge, PageHeader, Button, Select } from "../components/ui";
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
        description="Paints you have on the shelf."
        actions={<Button onClick={() => navigate("/paints")}>Add paints</Button>}
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data?.map((row) => (
          <Card
            key={row.inventory.id}
            className="cursor-pointer transition-all hover:border-workshop-accent hover:bg-slate-800/60"
            onClick={() => navigate(`/paints/${row.inventory.paintId}`)}
          >
            <div className="flex items-start gap-3">
              <span
                className="h-12 w-12 shrink-0 rounded-lg border border-workshop-border shadow-inner"
                style={{ backgroundColor: row.paint?.colorHex ?? "#334155" }}
              />
              <div className="flex-1">
                <h3 className="mb-1 font-semibold text-slate-100">{row.paint?.name || "Unknown paint"}</h3>
                <div className="mb-2 text-xs text-slate-400">
                  {row.paint?.productCode} · {row.paint?.type}
                  {row.paint?.finish ? ` · ${row.paint.finish}` : ""}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" tone={getLowStockTone(row.inventory.fillLevel)}>
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
