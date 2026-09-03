import { memo, useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  usePaints,
  useManufacturers,
  useAddPaintToInventory,
  useRemovePaintFromInventory,
  type PaintListRow,
  type PaintStatusFilter,
} from "../api/client";
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
  ListCard,
  ListCardRow,
  ListCardBody,
  ListCardTitle,
  ListCardMeta,
  ListCardActions,
} from "../components/ui";
import { AddPaintForm } from "../components/AddPaintForm";

type StatusFilter = PaintStatusFilter;

const SEARCH_DEBOUNCE_MS = 300;

const InventoryQuickAction = memo(function InventoryQuickAction({ row }: { row: PaintListRow }) {
  const addToInventory = useAddPaintToInventory();
  const removeFromInventory = useRemovePaintFromInventory();
  const inStock = row.inventory.length > 0;
  const busy = addToInventory.isPending || removeFromInventory.isPending;

  if (!inStock) {
    return (
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          addToInventory.mutate({ paintId: row.paint.id, quantity: 1 });
        }}
      >
        {busy ? "Adding…" : "+ Add to inventory"}
      </Button>
    );
  }

  const totalQty = row.inventory.reduce((sum, i) => sum + i.quantity, 0);
  return (
    <div className="flex items-center rounded-lg border border-workshop-border">
      <button
        type="button"
        title="Remove one (undo)"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          const last = row.inventory[row.inventory.length - 1]!;
          removeFromInventory.mutate(
            { id: last.id, paintId: row.paint.id },
            {
              onSuccess: () => {
                toast(`Removed "${row.paint.name}" from inventory`, {
                  action: {
                    label: "Undo",
                    onClick: () =>
                      addToInventory.mutate({
                        paintId: row.paint.id,
                        quantity: last.quantity,
                        fillLevel: last.fillLevel,
                        storageLocation: last.storageLocation ?? undefined,
                      }),
                  },
                });
              },
            },
          );
        }}
        className="px-2 py-1 text-sm font-medium text-slate-400 transition-colors hover:text-red-400 disabled:opacity-50"
      >
        −
      </button>
      <span className="px-1 text-xs font-semibold text-emerald-400">
        ✓ In stock{totalQty > 1 ? ` (${totalQty})` : ""}
      </span>
      <button
        type="button"
        title="Add another"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          addToInventory.mutate({ paintId: row.paint.id, quantity: 1 });
        }}
        className="px-2 py-1 text-sm font-medium text-slate-400 transition-colors hover:text-emerald-400 disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
});

const PaintRow = memo(function PaintRow({
  row,
  onOpen,
}: {
  row: PaintListRow;
  onOpen: (id: number) => void;
}) {
  return (
    <ListCard onClick={() => onOpen(row.paint.id)}>
      <ListCardRow>
        <span
          className="mt-0.5 h-9 w-9 shrink-0 rounded-full border border-workshop-border shadow-inner"
          style={{ backgroundColor: row.paint.colorHex ?? "#334155" }}
          aria-hidden
        />
        <ListCardBody>
          <ListCardTitle>{row.paint.name}</ListCardTitle>
          <ListCardMeta>
            <Badge>{row.paint.type}</Badge>
            <span>
              {row.manufacturer?.name} · {row.paint.productCode}
              {row.paint.finish ? ` · ${row.paint.finish}` : ""}
            </span>
          </ListCardMeta>
        </ListCardBody>
      </ListCardRow>
      <ListCardActions>
        <InventoryQuickAction row={row} />
      </ListCardActions>
    </ListCard>
  );
});

export default function Paints() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const manufacturerId = searchParams.get("manufacturerId") ?? "";
  const status = (searchParams.get("filter") as StatusFilter) ?? "all";
  const { data: manufacturers } = useManufacturers();
  const [showAddForm, setShowAddForm] = useState(false);

  const [searchDraft, setSearchDraft] = useState(search);
  useEffect(() => setSearchDraft(search), [search]);

  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (searchDraft === search) {
      return;
    }
    const handle = setTimeout(() => updateParams({ q: searchDraft }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = usePaints(
    search,
    manufacturerId ? Number(manufacturerId) : undefined,
    true,
    status,
  );

  const hasFilter = !!search.trim() || !!manufacturerId || status !== "all";
  const selectedManufacturer = manufacturers?.find((m) => m.id === Number(manufacturerId));
  const openPaint = useCallback((id: number) => navigate(`/paints/${id}`), [navigate]);

  const filtered = data?.pages.flatMap((page) => page.rows);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Paints"
        description="Every paint in the catalog — owned and wishlist."
        actions={!showAddForm && <Button onClick={() => setShowAddForm(true)}>+ Add paint</Button>}
      />

      {showAddForm && (
        <AddPaintForm
          onCreated={(paint) => {
            setShowAddForm(false);
            navigate(`/paints/${paint.id}`);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
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
          filtered?.map((row) => <PaintRow key={row.paint.id} row={row} onOpen={openPaint} />)}
      </div>

      {hasFilter && hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
