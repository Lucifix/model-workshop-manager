import { useNavigate } from "react-router";
import { useProjects } from "../api/client";
import {
  LoadingState,
  ErrorState,
  EmptyState,
  Badge,
  PageHeader,
  ProgressBar,
  Button,
  MediaCard,
} from "../components/ui";

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
      {data && data.length === 0 && (
        <EmptyState message="No builds yet — start your first project." />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((row) => (
          <MediaCard
            key={row.project.id}
            image={row.coverPhotoUrl ?? row.model?.imageUrl}
            imageAlt={row.project.name}
            className="cursor-pointer animate-fade-up"
            onClick={() => navigate(`/projects/${row.project.id}`)}
            overlay={
              <Badge tone={statusTone[row.project.status as keyof typeof statusTone] ?? "neutral"}>
                {row.project.status}
              </Badge>
            }
          >
            <h3 className="mb-1 truncate font-semibold text-slate-100">{row.project.name}</h3>
            <div className="mb-3 truncate text-xs text-slate-400">
              {row.model?.name} ({row.model?.kitNumber})
            </div>
            <div className="flex items-center gap-2">
              <ProgressBar percent={row.project.progressPercent} className="flex-1" />
              <span className="text-xs font-medium text-slate-400">
                {row.project.progressPercent}%
              </span>
            </div>
          </MediaCard>
        ))}
      </div>
    </div>
  );
}
