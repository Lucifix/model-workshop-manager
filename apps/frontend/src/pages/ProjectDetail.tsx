import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useProjectDetail, useUpdateProject, useAddBuildLogEntry, useUploadProjectPhoto } from "../api/client";
import { Card, LoadingState, ErrorState, Badge } from "../components/ui";

type TabType = "overview" | "paints" | "log" | "photos" | "notes";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [editProgress, setEditProgress] = useState(false);
  const [newProgress, setNewProgress] = useState(0);
  const [newStatus, setNewStatus] = useState("");
  const [logFormOpen, setLogFormOpen] = useState(false);
  const [logTitle, setLogTitle] = useState("");
  const [logDesc, setLogDesc] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const { data: project, isLoading, isError } = useProjectDetail(Number(id!));
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject();
  const { mutate: addBuildLog, isPending: isAddingLog } = useAddBuildLogEntry();
  const { mutate: uploadPhoto, isPending: isUploadingPhoto } = useUploadProjectPhoto();

  if (!id || isNaN(Number(id))) {
    return <ErrorState message="Invalid project ID." />;
  }

  if (isLoading) return <LoadingState />;
  if (isError || !project) return <ErrorState message="Could not load project." />;

  const handleUpdateProgress = () => {
    updateProject({ id: project.id, data: { progressPercent: newProgress } }, {
      onSuccess: () => setEditProgress(false),
    });
  };

  const handleUpdateStatus = (status: string) => {
    updateProject({ id: project.id, data: { status } });
    setNewStatus("");
  };

  const handleAddLogEntry = (e: React.FormEvent) => {
    e.preventDefault();
    addBuildLog({ projectId: project.id, data: { title: logTitle, description: logDesc } }, {
      onSuccess: () => {
        setLogTitle("");
        setLogDesc("");
        setLogFormOpen(false);
      },
    });
  };

  const handleUploadPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) return;
    uploadPhoto({ projectId: project.id, file: photoFile }, {
      onSuccess: () => {
        setPhotoFile(null);
      },
    });
  };

  const tabs: Array<{ id: TabType; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "paints", label: "Paints" },
    { id: "log", label: "Build Log" },
    { id: "photos", label: "Photos" },
    { id: "notes", label: "Notes" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate("/projects")}
        className="mb-2 text-sm text-slate-400 hover:text-slate-100"
      >
        ← Back to projects
      </button>

      <Card className="mb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-3xl font-bold text-slate-100">{project.name}</h1>
            {project.model && (
              <p className="text-sm text-slate-400">
                {project.model.name} ({project.model.kitNumber})
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={project.status}
              onChange={(e) => handleUpdateStatus(e.target.value)}
              className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
            >
              <option value="Planned">Planned</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
              <option value="Abandoned">Abandoned</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-300">Progress</span>
              <span className="text-sm font-bold text-workshop-accent">{project.progressPercent}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-workshop-accent transition-all"
                style={{ width: `${project.progressPercent}%` }}
              />
            </div>
            {!editProgress ? (
              <button
                onClick={() => {
                  setEditProgress(true);
                  setNewProgress(project.progressPercent);
                }}
                className="mt-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Edit progress
              </button>
            ) : (
              <div className="mt-2 flex gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={newProgress}
                  onChange={(e) => setNewProgress(parseInt(e.target.value))}
                  className="flex-1"
                />
                <button
                  onClick={handleUpdateProgress}
                  disabled={isUpdating}
                  className="rounded bg-workshop-accent px-2 py-1 text-xs font-medium text-slate-900 hover:bg-workshop-accent/90 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditProgress(false)}
                  className="rounded border border-slate-700 px-2 py-1 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {project.startedAt && (
            <div className="flex flex-col gap-1 sm:text-right">
              <span className="text-xs text-slate-400">Started</span>
              <span className="font-semibold text-slate-100">
                {new Date(project.startedAt).toLocaleDateString()}
              </span>
            </div>
          )}
          {project.completedAt && (
            <div className="flex flex-col gap-1 sm:text-right">
              <span className="text-xs text-slate-400">Completed</span>
              <span className="font-semibold text-slate-100">
                {new Date(project.completedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-workshop-accent text-worksheet-accent"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "overview" && (
          <div className="flex flex-col gap-4">
            {project.model && (
              <Card>
                <h2 className="mb-3 text-sm font-semibold text-slate-300">Model</h2>
                <button
                  onClick={() => navigate(`/models/${project.model!.id}`)}
                  className="text-sm font-medium text-workshop-accent hover:underline"
                >
                  {project.model.name} ({project.model.kitNumber})
                </button>
              </Card>
            )}
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-slate-300">Key Info</h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-slate-400">Status</dt>
                  <dd className="font-medium text-slate-100">{project.status}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Progress</dt>
                  <dd className="font-medium text-slate-100">{project.progressPercent}%</dd>
                </div>
                {project.startedAt && (
                  <div>
                    <dt className="text-slate-400">Started</dt>
                    <dd className="font-medium text-slate-100">
                      {new Date(project.startedAt).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {project.completedAt && (
                  <div>
                    <dt className="text-slate-400">Completed</dt>
                    <dd className="font-medium text-slate-100">
                      {new Date(project.completedAt).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </Card>
          </div>
        )}

        {activeTab === "paints" && (
          <div className="flex flex-col gap-4">
            <Card>
              <h2 className="mb-4 text-sm font-semibold text-slate-300">Paints used in this build</h2>
              {project.usedPaints && project.usedPaints.length > 0 ? (
                <ul className="space-y-2">
                  {project.usedPaints.map((row) => (
                    <li key={row.projectPaint.paintId} className="flex items-center gap-3 rounded border border-slate-700 p-2 text-sm">
                      <span
                        className="h-5 w-5 rounded-full border border-slate-600 flex-shrink-0"
                        style={{ backgroundColor: row.paint?.colorHex ?? "#334155" }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-100">{row.paint?.name}</div>
                        <div className="text-xs text-slate-500">
                          Purpose: {row.projectPaint.purpose}
                          {row.projectPaint.notes ? ` · ${row.projectPaint.notes}` : ""}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No paints recorded for this build yet.</p>
              )}
            </Card>
          </div>
        )}

        {activeTab === "log" && (
          <div className="flex flex-col gap-4">
            {!logFormOpen ? (
              <button
                onClick={() => setLogFormOpen(true)}
                className="rounded bg-workshop-accent px-4 py-2 text-sm font-medium text-slate-900 hover:bg-workshop-accent/90"
              >
                + Add progress
              </button>
            ) : (
              <Card>
                <form onSubmit={handleAddLogEntry} className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={logTitle}
                    onChange={(e) => setLogTitle(e.target.value)}
                    placeholder="What did you work on?"
                    required
                    className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
                  />
                  <textarea
                    value={logDesc}
                    onChange={(e) => setLogDesc(e.target.value)}
                    placeholder="Add details (optional)"
                    rows={3}
                    className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isAddingLog}
                      className="flex-1 rounded bg-workshop-accent px-3 py-2 text-sm font-medium text-slate-900 hover:bg-workshop-accent/90 disabled:opacity-50"
                    >
                      {isAddingLog ? "Adding..." : "Add entry"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogFormOpen(false)}
                      className="flex-1 rounded border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </Card>
            )}

            {project.log && project.log.length > 0 ? (
              <div className="space-y-3">
                {project.log.map((entry) => (
                  <Card key={entry.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="mb-1 font-semibold text-slate-100">{entry.title}</h3>
                        {entry.description && (
                          <p className="mb-2 text-xs text-slate-400">{entry.description}</p>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-xs text-slate-500">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No log entries yet. Click "Add progress" to get started!</p>
            )}
          </div>
        )}

        {activeTab === "photos" && (
          <div className="flex flex-col gap-4">
            {!photoFile ? (
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-700 p-8">
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium text-slate-300">Upload a photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <Card>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-100">{photoFile.name}</p>
                    <p className="text-xs text-slate-500">{(photoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => {
                        const formData = new FormData();
                        formData.append("file", photoFile);
                        uploadPhoto({ projectId: project.id, file: photoFile });
                      }}
                      disabled={isUploadingPhoto}
                      className="rounded bg-workshop-accent px-3 py-1 text-xs font-medium text-slate-900 hover:bg-workshop-accent/90 disabled:opacity-50"
                    >
                      {isUploadingPhoto ? "Uploading..." : "Upload"}
                    </button>
                    <button
                      onClick={() => setPhotoFile(null)}
                      className="rounded border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </Card>
            )}

            {project.photos && project.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {project.photos.map((photo) => (
                  <div key={photo.id} className="rounded-lg border border-slate-700 overflow-hidden">
                    <img
                      src={`/uploads/${photo.filename}`}
                      alt={photo.originalFilename || "Project photo"}
                      className="w-full h-32 object-cover"
                    />
                    {photo.caption && (
                      <div className="bg-slate-800 p-2 text-xs text-slate-300">{photo.caption}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No photos yet. Upload one to get started!</p>
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-300">Notes</h2>
            {project.notes ? (
              <p className="whitespace-pre-wrap text-sm text-slate-300">{project.notes}</p>
            ) : (
              <p className="text-xs text-slate-500">No notes yet.</p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
