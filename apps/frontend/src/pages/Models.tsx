import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useModels,
  useAddModelToInventory,
  useRemoveModelFromInventory,
  type ModelListRow,
} from "../api/client";
import {
  LoadingState,
  ErrorState,
  EmptyState,
  Badge,
  PageHeader,
  Input,
  Button,
  MediaCard,
  SegmentedControl,
} from "../components/ui";
import { AddModelForm } from "../components/AddModelForm";

type StatusFilter = "all" | "owned" | "not_owned";

function OwnershipControl({ row }: { row: ModelListRow }) {
  const addToInventory = useAddModelToInventory();
  const removeFromInventory = useRemoveModelFromInventory();
  const owned = row.ownership.length > 0;
  const totalQty = row.ownership.reduce((sum, o) => sum + o.quantity, 0);
  const busy = addToInventory.isPending || removeFromInventory.isPending;

  if (!owned) {
    return (
      <Button
        size="sm"
        variant="secondary"
        className="w-full"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          addToInventory.mutate({ modelId: row.model.id, quantity: 1 });
        }}
      >
        {busy ? "Adding…" : "+ Mark owned"}
      </Button>
    );
  }

  return (
    <div className="flex w-full items-center justify-between rounded-lg border border-workshop-border">
      <button
        type="button"
        title="Remove one (undo)"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          const last = row.ownership[row.ownership.length - 1]!;
          removeFromInventory.mutate({ id: last.id, modelId: row.model.id });
        }}
        className="px-2.5 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-red-400 disabled:opacity-50"
      >
        −
      </button>
      <span className="flex-1 text-center text-xs font-semibold text-emerald-400">✓ Owned{totalQty > 1 ? ` (${totalQty})` : ""}</span>
      <button
        type="button"
        title="Add another copy"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          addToInventory.mutate({ modelId: row.model.id, quantity: 1 });
        }}
        className="px-2.5 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-emerald-400 disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}

export default function Models() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get("filter") as StatusFilter) ?? "all";
  const { data, isLoading, isError } = useModels(search);

  const setStatus = (value: StatusFilter) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete("filter");
    else next.set("filter", value);
    setSearchParams(next, { replace: true });
  };

  const filtered = data?.filter((row) => {
    if (status === "owned") return row.ownership.length > 0;
    if (status === "not_owned") return row.ownership.length === 0;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Models"
        description="Every kit in the catalog — owned and wishlist."
        actions={!showAddForm && <Button onClick={() => setShowAddForm(true)}>+ Add model</Button>}
      />

      {showAddForm && (
        <AddModelForm
          onCreated={(model) => navigate(`/models/${model.id}`)}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search models (name or kit number)…"
          className="sm:max-w-sm"
        />
        <SegmentedControl
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All" },
            { value: "owned", label: "Owned" },
            { value: "not_owned", label: "Not owned" },
          ]}
        />
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Could not load models." />}
      {filtered && filtered.length === 0 && (
        <EmptyState
          message={
            status === "owned"
              ? "You don't own any of these yet."
              : status === "not_owned"
                ? "Everything matching this search is already in your collection."
                : "No models yet — add your first kit."
          }
        />
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered?.map((row) => (
          <MediaCard
            key={row.model.id}
            image={row.model.imageUrl}
            imageAlt={row.model.name}
            className="cursor-pointer animate-fade-up"
            onClick={() => navigate(`/models/${row.model.id}`)}
            overlay={row.model.scale && <Badge variant="secondary">{row.model.scale}</Badge>}
          >
            <h3 className="mb-1 truncate font-semibold text-slate-100">{row.model.name}</h3>
            <div className="mb-3 truncate text-xs text-slate-400">
              {row.manufacturer?.name} · {row.model.kitNumber}
            </div>
            <OwnershipControl row={row} />
          </MediaCard>
        ))}
      </div>
    </div>
  );
}
