import { useNavigate } from "react-router-dom";
import { useDashboard } from "../api/client";
import { StatTile, LoadingState, ErrorState, EmptyState, PageHeader, SectionCard, Button } from "../components/ui";
import { ArchiveIcon, BeakerIcon, BoxIcon, CartIcon, DropletIcon, HammerIcon } from "../components/icons";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message="Could not load dashboard data." />;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Dashboard"
        description="An overview of your workshop."
        actions={<Button onClick={() => navigate("/projects/new")}>+ New Build</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Model kits" value={data.totalModelKits} icon={<BoxIcon className="h-5 w-5" />} />
        <StatTile label="In progress" value={data.inProgressCount} icon={<HammerIcon className="h-5 w-5" />} />
        <StatTile label="Completed" value={data.completedCount} icon={<ArchiveIcon className="h-5 w-5" />} tone="ok" />
        <StatTile label="Planned" value={data.plannedCount} icon={<CartIcon className="h-5 w-5" />} />
        <StatTile label="Paints" value={data.totalPaints} icon={<DropletIcon className="h-5 w-5" />} />
        <StatTile
          label="Low stock"
          value={data.lowStockCount}
          icon={<BeakerIcon className="h-5 w-5" />}
          tone={data.lowStockCount > 0 ? "warn" : "neutral"}
        />
      </div>

      <SectionCard title="Recent activity">
        {data.recentActivity.length === 0 ? (
          <EmptyState message="No build log entries yet." />
        ) : (
          <ul className="flex flex-col gap-2">
            {data.recentActivity.map((entry, i) => (
              <li key={i} className="flex items-baseline justify-between text-sm">
                <span>
                  <span className="font-medium text-slate-100">{entry.projectName ?? "—"}</span>
                  <span className="text-slate-400"> · {entry.title}</span>
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Recently added models">
        {data.recentlyAddedModels.length === 0 ? (
          <EmptyState message="No models yet — add your first kit." />
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {data.recentlyAddedModels.map((m) => (
              <li key={m.id}>
                {m.name} <span className="text-slate-500">({m.kitNumber})</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
