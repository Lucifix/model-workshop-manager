import { useNavigate, useSearchParams } from "react-router-dom";
import { usePaints, useManufacturers, useAddPaintToInventory, type PaintListRow } from "../api/client";
import {
  Card,
  LoadingState,
  ErrorState,
  EmptyState,
  Badge,
  PageHeader,
  Input,
  Select,
  Button,
  ManufacturerAvatar,
  SegmentedControl,
} from "../components/ui";

type StatusFilter = "all" | "owned" | "not_owned";

function InventoryQuickAction({ row }: { row: PaintListRow }) {
  const addToInventory = useAddPaintToInventory();
  const inStock = row.inventory.length > 0;

  if (inStock) {
    const totalQty = row.inventory.reduce((sum, i) => sum + i.quantity, 0);
    return <Badge tone="ok">✓ In stock{totalQty > 1 ? ` (${totalQty})` : ""}</Badge>;
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={addToInventory.isPending}
      onClick={(e) => {
        e.stopPropagation();
        addToInventory.mutate({ paintId: row.paint.id, quantity: 1 });
      }}
    >
      {addToInventory.isPending ? "Adding…" : "+ Add to inventory"}
    </Button>
  );
}

export default function Paints() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const manufacturerId = searchParams.get("manufacturerId") ?? "";
  const status = (searchParams.get("filter") as StatusFilter) ?? "all";
  const { data: manufacturers } = useManufacturers();
  const { data, isLoading, isError } = usePaints(
    search,
    manufacturerId ? Number(manufacturerId) : undefined,
    true,
    status !== "all"
  );

  const hasFilter = !!search.trim() || !!manufacturerId || status !== "all";
  const selectedManufacturer = manufacturers?.find((m) => m.id === Number(manufacturerId));

  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const filtered = data?.filter((row) => {
    if (status === "owned") return row.inventory.length > 0;
    if (status === "not_owned") return row.inventory.length === 0;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Paints" description="Every paint in the catalog — owned and wishlist." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(e) => updateParams({ q: e.target.value })}
          placeholder="Search paints (name or product code)…"
          className="flex-1"
        />
        <Select
          value={manufacturerId}
          onChange={(e) => updateParams({ manufacturerId: e.target.value })}
          className="sm:w-56"
        >
          <option value="">All manufacturers</option>
          {manufacturers?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.paintCount ? ` (${m.paintCount})` : ""}
            </option>
          ))}
        </Select>
        <SegmentedControl
          value={status}
          onChange={(value) => updateParams({ filter: value === "all" ? "" : value })}
          options={[
            { value: "all", label: "All" },
            { value: "owned", label: "Owned" },
            { value: "not_owned", label: "Not owned" },
          ]}
        />
      </div>

      {!hasFilter && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-400">Browse by manufacturer, or search above.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {manufacturers?.map((m) => (
              <Card
                key={m.id}
                className="flex cursor-pointer items-center gap-3 transition-all hover:border-workshop-accent hover:bg-slate-800/60"
                onClick={() => updateParams({ manufacturerId: String(m.id) })}
              >
                <ManufacturerAvatar manufacturer={m} />
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-100">{m.name}</div>
                  <div className="text-xs text-slate-400">
                    {m.paintCount ?? 0} paint{m.paintCount === 1 ? "" : "s"}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {hasFilter && selectedManufacturer && (
        <div className="flex items-center gap-2">
          <ManufacturerAvatar manufacturer={selectedManufacturer} size="sm" />
          <span className="text-sm text-slate-300">{selectedManufacturer.name}</span>
          <button
            className="text-xs text-slate-500 hover:text-slate-300"
            onClick={() => updateParams({ manufacturerId: "" })}
          >
            Clear
          </button>
        </div>
      )}

      {hasFilter && isLoading && <LoadingState />}
      {hasFilter && isError && <ErrorState message="Could not load paints." />}
      {hasFilter && filtered && filtered.length === 0 && (
        <EmptyState
          message={
            status === "owned"
              ? "None of these are in your inventory yet."
              : status === "not_owned"
                ? "Everything matching this search is already in your inventory."
                : "No paints match that search."
          }
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {hasFilter &&
          filtered?.map((row) => (
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
              <div className="flex-shrink-0">
                <InventoryQuickAction row={row} />
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
