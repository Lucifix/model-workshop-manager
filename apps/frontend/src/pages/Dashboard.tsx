import { useDashboard } from "../api/client";
import { StatTile, Card, LoadingState, ErrorState, EmptyState } from "../components/ui";

export default function Dashboard() {
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message="Could not load dashboard data." />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Model kits" value={data.totalModelKits} />
        <StatTile label="In progress" value={data.inProgressCount} />
        <StatTile label="Completed" value={data.completedCount} />
        <StatTile label="Planned" value={data.plannedCount} />
        <StatTile label="Paints" value={data.totalPaints} />
        <StatTile label="Low stock" value={data.lowStockCount} />
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Recent activity</h2>
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
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Recently added models</h2>
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
      </Card>
    </div>
  );
}
