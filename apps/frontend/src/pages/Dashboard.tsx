import { useNavigate } from "react-router-dom";
import { useDashboard, useProjects } from "../api/client";
import {
  StatTile,
  LoadingState,
  ErrorState,
  EmptyState,
  PageHeader,
  SectionCard,
  Button,
  ModelThumbnail,
  ProgressBar,
  Badge,
} from "../components/ui";
import { ArchiveIcon, BeakerIcon, BoxIcon, CartIcon, DropletIcon, HammerIcon } from "../components/icons";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useDashboard();
  const { data: projects } = useProjects();

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message="Could not load dashboard data." />;

  const inProgress = projects?.filter((r) => r.project.status === "In Progress") ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Workshop"
        description="What's on the bench right now."
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

      <SectionCard title="Continue building" actions={<Badge variant="secondary">{inProgress.length} active</Badge>}>
        {inProgress.length === 0 ? (
          <EmptyState message="Nothing in progress — start a build to see it here." />
        ) : (
          <div className="flex flex-col gap-2">
            {inProgress.map((row) => (
              <button
                key={row.project.id}
                onClick={() => navigate(`/projects/${row.project.id}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition-colors hover:border-workshop-border hover:bg-workshop-panelmuted"
              >
                <ModelThumbnail imageUrl={row.model?.imageUrl} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-100">{row.project.name}</div>
                  <div className="mb-1.5 truncate text-xs text-slate-400">
                    {row.model?.name} ({row.model?.kitNumber})
                  </div>
                  <div className="flex items-center gap-2">
                    <ProgressBar percent={row.project.progressPercent} className="max-w-xs flex-1" />
                    <span className="text-xs font-medium text-workshop-accent">{row.project.progressPercent}%</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </SectionCard>

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
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {data.recentlyAddedModels.map((m) => (
              <button
                key={m.id}
                onClick={() => navigate(`/models/${m.id}`)}
                className="flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-center transition-colors hover:bg-workshop-panelmuted"
              >
                <ModelThumbnail imageUrl={m.imageUrl} size="lg" className="w-full aspect-square h-auto" />
                <span className="line-clamp-2 text-xs font-medium text-slate-300">{m.name}</span>
              </button>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
