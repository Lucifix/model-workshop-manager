import { useProjects } from "../api/client";
import { Card, LoadingState, ErrorState, EmptyState, Badge } from "../components/ui";

const statusTone = {
  "In Progress": "ok",
  Completed: "ok",
  "On Hold": "warn",
  Abandoned: "warn",
  Planned: "neutral",
} as const;

export default function Projects() {
  const { data, isLoading, isError } = useProjects();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load projects." />;
  if (!data || data.length === 0) return <EmptyState message="No builds yet — start your first project." />;

  return (
    <div className="flex flex-col gap-3">
      {data.map((row) => (
        <Card key={row.project.id}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-100">{row.project.name}</div>
              <div className="text-xs text-slate-400">
                {row.model?.name} ({row.model?.kitNumber})
              </div>
            </div>
            <Badge tone={statusTone[row.project.status as keyof typeof statusTone] ?? "neutral"}>
              {row.project.status}
            </Badge>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-workshop-accent"
              style={{ width: `${row.project.progressPercent}%` }}
            />
          </div>
          <div className="mt-1 text-right text-xs text-slate-500">{row.project.progressPercent}%</div>
        </Card>
      ))}
    </div>
  );
}
