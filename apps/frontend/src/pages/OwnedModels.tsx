import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, LoadingState, ErrorState, EmptyState, Badge, PageHeader, Button } from "../components/ui";

interface OwnedModelRow {
  owned: {
    id: number;
    modelId: number;
    owned: boolean;
    quantity: number;
    condition?: string;
    storageLocation?: string;
    notes?: string;
  };
  model: {
    id: number;
    kitNumber: string;
    name: string;
  } | null;
}

async function fetchOwnedModels(): Promise<OwnedModelRow[]> {
  const res = await fetch("/api/inventory/models");
  if (!res.ok) throw new Error("Failed to fetch owned models");
  return res.json();
}

export default function OwnedModels() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["inventory", "models"],
    queryFn: fetchOwnedModels,
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="My Collection"
        description="Model kits you own."
        actions={<Button onClick={() => navigate("/models")}>Add models</Button>}
      />

      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Could not load your model collection." />}
      {data && data.length === 0 && <EmptyState message="You haven't added any models yet. Click 'Add models' to get started!" />}

      <div className="space-y-3">
        {data?.map((row) => (
          <Card
            key={row.owned.id}
            className="cursor-pointer transition-all hover:border-workshop-accent hover:bg-slate-800/60"
            onClick={() => navigate(`/models/${row.owned.modelId}`)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="mb-1 font-semibold text-slate-100">{row.model?.name || "Unknown model"}</h3>
                <div className="mb-2 text-xs text-slate-400">
                  {row.model?.kitNumber && <>Kit: {row.model.kitNumber} · </>}
                  Quantity: {row.owned.quantity}
                </div>
                {row.owned.condition && (
                  <Badge variant="secondary" tone={row.owned.condition === "unbuilt" ? "neutral" : "ok"}>
                    {row.owned.condition}
                  </Badge>
                )}
              </div>
              {row.owned.storageLocation && (
                <div className="text-right text-xs text-slate-500">
                  📍 {row.owned.storageLocation}
                </div>
              )}
            </div>
            {row.owned.notes && (
              <div className="mt-2 text-xs text-slate-500">
                Notes: {row.owned.notes}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
