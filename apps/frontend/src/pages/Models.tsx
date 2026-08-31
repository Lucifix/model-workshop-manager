import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useModels, useAddModelToInventory, type ModelListRow } from "../api/client";
import {
  Card,
  LoadingState,
  ErrorState,
  EmptyState,
  Badge,
  PageHeader,
  Input,
  Button,
  ModelThumbnail,
  SegmentedControl,
} from "../components/ui";
import { AddModelForm } from "../components/AddModelForm";

type StatusFilter = "all" | "owned" | "not_owned";

function OwnershipQuickAction({ row }: { row: ModelListRow }) {
  const addToInventory = useAddModelToInventory();
  const owned = row.ownership.length > 0;

  if (owned) {
    const totalQty = row.ownership.reduce((sum, o) => sum + o.quantity, 0);
    return (
      <Badge tone="ok">
        ✓ Owned{totalQty > 1 ? ` (${totalQty})` : ""}
      </Badge>
    );
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={addToInventory.isPending}
      onClick={(e) => {
        e.stopPropagation();
        addToInventory.mutate({ modelId: row.model.id, quantity: 1 });
      }}
    >
      {addToInventory.isPending ? "Adding…" : "+ Mark owned"}
    </Button>
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filtered?.map((row) => (
          <Card
            key={row.model.id}
            className="flex cursor-pointer items-center gap-3 transition-all hover:border-workshop-accent hover:bg-slate-800/60"
            onClick={() => navigate(`/models/${row.model.id}`)}
          >
            <ModelThumbnail imageUrl={row.model.imageUrl} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-slate-100">{row.model.name}</span>
                {row.model.scale && <Badge>{row.model.scale}</Badge>}
              </div>
              <div className="text-xs text-slate-400">
                {row.manufacturer?.name} · {row.model.kitNumber}
              </div>
            </div>
            <div className="flex-shrink-0">
              <OwnershipQuickAction row={row} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
