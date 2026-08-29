import { useNavigate } from "react-router-dom";
import { useProjects } from "../api/client";
import { Card, LoadingState, ErrorState, EmptyState, Badge, PageHeader, ProgressBar, Button } from "../components/ui";

const statusTone = {
  "In Progress": "ok",
  Completed: "ok",
  "On Hold": "warn",
  Abandoned: "warn",
  Planned: "neutral",
} as const;

export default function Projects() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useProjects();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Builds"
        description="Your in-progress and completed builds."
        actions={<Button onClick={() => navigate("/projects/new")}>+ New Build</Button>}
      />

      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Could not load projects." />}
      {data && data.length === 0 && <EmptyState message="No builds yet — start your first project." />}

      <div className="flex flex-col gap-3">
        {data?.map((row) => (
          <Card
            key={row.project.id}
            className="cursor-pointer transition-all hover:border-workshop-accent hover:bg-slate-800/60"
            onClick={() => navigate(`/projects/${row.project.id}`)}
          >
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
            <ProgressBar percent={row.project.progressPercent} className="mt-3" />
            <div className="mt-1 text-right text-xs text-slate-500">{row.project.progressPercent}%</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
