import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useModels } from "../api/client";
import { Card, LoadingState, ErrorState, EmptyState, Badge, PageHeader, Input, Button, ModelThumbnail } from "../components/ui";
import { AddModelForm } from "../components/AddModelForm";

export default function Models() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const { data, isLoading, isError } = useModels(search);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Model Catalog"
        description="Every kit in the shared catalog."
        actions={!showAddForm && <Button onClick={() => setShowAddForm(true)}>+ Add model</Button>}
      />

      {showAddForm && (
        <AddModelForm
          onCreated={(model) => navigate(`/models/${model.id}`)}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search models (name or kit number)…"
      />

      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Could not load models." />}
      {data && data.length === 0 && <EmptyState message="No models yet — add your first kit." />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data?.map((row) => (
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
          </Card>
        ))}
      </div>
    </div>
  );
}
