import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LoadingState, ErrorState, EmptyState, Badge, PageHeader, Button, MediaCard } from "../components/ui";

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
    imageUrl?: string;
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
        description={data && data.length > 0 ? `${data.length} kit${data.length === 1 ? "" : "s"} on the shelf.` : "Model kits you own."}
        actions={<Button onClick={() => navigate("/models")}>+ Add models</Button>}
      />

      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Could not load your model collection." />}
      {data && data.length === 0 && <EmptyState message="You haven't added any models yet. Click 'Add models' to get started!" />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((row) => (
          <MediaCard
            key={row.owned.id}
            image={row.model?.imageUrl}
            imageAlt={row.model?.name}
            className="cursor-pointer animate-fade-up"
            onClick={() => navigate(`/models/${row.owned.modelId}`)}
            overlay={
              row.owned.condition && (
                <Badge variant="secondary" tone={row.owned.condition === "unbuilt" ? "neutral" : "ok"}>
                  {row.owned.condition}
                </Badge>
              )
            }
          >
            <h3 className="mb-1 truncate font-semibold text-slate-100">{row.model?.name || "Unknown model"}</h3>
            <div className="mb-2 text-xs text-slate-400">
              {row.model?.kitNumber && <>Kit: {row.model.kitNumber} · </>}
              Qty: {row.owned.quantity}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              {row.owned.storageLocation ? <span>📍 {row.owned.storageLocation}</span> : <span />}
            </div>
            {row.owned.notes && <div className="mt-2 truncate text-xs text-slate-500">{row.owned.notes}</div>}
          </MediaCard>
        ))}
      </div>
    </div>
  );
}
