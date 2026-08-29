import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  useProjectDetail,
  useUpdateProject,
  useAddBuildLogEntry,
  useUploadProjectPhoto,
  useAddProjectPaint,
  useRemoveProjectPaint,
  useDeleteProjectPhoto,
} from "../api/client";
import { Card, LoadingState, ErrorState, Button, Input, Select, Textarea, ProgressBar, ModelThumbnail } from "../components/ui";
import { PaintPicker, type PickedPaint } from "../components/PaintPicker";

type TabType = "overview" | "paints" | "log" | "photos" | "notes";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [editProgress, setEditProgress] = useState(false);
  const [newProgress, setNewProgress] = useState(0);
  const [logFormOpen, setLogFormOpen] = useState(false);
  const [logTitle, setLogTitle] = useState("");
  const [logDesc, setLogDesc] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [showAddPaint, setShowAddPaint] = useState(false);
  const [selectedPaint, setSelectedPaint] = useState<PickedPaint | null>(null);
  const [paintPurpose, setPaintPurpose] = useState<"required" | "optional" | "weathering" | "already_substituted">(
    "required"
  );

  const { data: project, isLoading, isError } = useProjectDetail(Number(id!));
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject();
  const { mutate: addBuildLog, isPending: isAddingLog } = useAddBuildLogEntry();
  const { mutate: uploadPhoto, isPending: isUploadingPhoto } = useUploadProjectPhoto();
  const addProjectPaint = useAddProjectPaint();
  const removeProjectPaint = useRemoveProjectPaint();
  const deletePhoto = useDeleteProjectPhoto();

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

  const handleAddPaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaint) return;
    addProjectPaint.mutate(
      { projectId: project.id, data: { paintId: selectedPaint.id, purpose: paintPurpose } },
      {
        onSuccess: () => {
          setSelectedPaint(null);
          setPaintPurpose("required");
          setShowAddPaint(false);
        },
      }
    );
  };

  const handleUploadPhoto = () => {
    if (!photoFile) return;
    uploadPhoto({ projectId: project.id, file: photoFile }, {
      onSuccess: () => setPhotoFile(null),
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
      <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} className="self-start -ml-2.5">
        ← Back to builds
      </Button>

      <Card className="mb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <ModelThumbnail imageUrl={project.model?.imageUrl} size="lg" />
            <div className="min-w-0">
              <h1 className="mb-1 truncate text-3xl font-bold text-slate-100">{project.name}</h1>
              {project.model && (
                <p className="truncate text-sm text-slate-400">
                  {project.model.name} ({project.model.kitNumber})
                </p>
              )}
            </div>
          </div>
          <div className="w-44 flex-shrink-0">
            <Select value={project.status} onChange={(e) => handleUpdateStatus(e.target.value)}>
              <option value="Planned">Planned</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
              <option value="Abandoned">Abandoned</option>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-300">Progress</span>
              <span className="text-sm font-bold text-workshop-accent">{project.progressPercent}%</span>
            </div>
            <ProgressBar percent={project.progressPercent} className="h-3" />
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
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={newProgress}
                  onChange={(e) => setNewProgress(parseInt(e.target.value))}
                  className="flex-1 accent-workshop-accent"
                />
                <Button size="sm" onClick={handleUpdateProgress} disabled={isUpdating}>
                  Save
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditProgress(false)}>
                  Cancel
                </Button>
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

      <div className="border-b border-workshop-border">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-workshop-accent text-workshop-accent"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

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
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300">Photos</h2>
                <button
                  onClick={() => setActiveTab("photos")}
                  className="text-xs text-workshop-accent hover:underline"
                >
                  {project.photos?.length ? `View all (${project.photos.length})` : "Add photos"}
                </button>
              </div>
              {project.photos && project.photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {project.photos.slice(0, 8).map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => setActiveTab("photos")}
                      className="overflow-hidden rounded-lg border border-workshop-border"
                    >
                      <img
                        src={`/uploads/${photo.filename}`}
                        alt={photo.originalFilename || "Project photo"}
                        className="aspect-square w-full object-cover transition-transform hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No photos yet — the Photos tab has a quick upload.</p>
              )}
            </Card>
          </div>
        )}

        {activeTab === "paints" && (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300">Paints used in this build</h2>
                {!showAddPaint && (
                  <Button size="sm" variant="secondary" onClick={() => setShowAddPaint(true)}>
                    + Add paint
                  </Button>
                )}
              </div>

              {showAddPaint && (
                <form onSubmit={handleAddPaint} className="mb-4 flex flex-col gap-2 rounded-lg border border-workshop-border p-3">
                  {!selectedPaint ? (
                    <PaintPicker onSelect={setSelectedPaint} />
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className="h-4 w-4 rounded-full border border-workshop-border"
                        style={{ backgroundColor: selectedPaint.colorHex ?? "#334155" }}
                      />
                      <span className="flex-1 truncate text-slate-200">{selectedPaint.name}</span>
                      <button type="button" className="text-xs text-slate-500 hover:text-slate-300" onClick={() => setSelectedPaint(null)}>
                        change
                      </button>
                    </div>
                  )}
                  <Select value={paintPurpose} onChange={(e) => setPaintPurpose(e.target.value as typeof paintPurpose)}>
                    <option value="required">Required</option>
                    <option value="optional">Optional</option>
                    <option value="weathering">Weathering</option>
                    <option value="already_substituted">Already substituted</option>
                  </Select>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={!selectedPaint || addProjectPaint.isPending} className="flex-1">
                      {addProjectPaint.isPending ? "Adding…" : "Add"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        setShowAddPaint(false);
                        setSelectedPaint(null);
                        setPaintPurpose("required");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {project.usedPaints && project.usedPaints.length > 0 ? (
                <ul className="space-y-2">
                  {project.usedPaints.map((row) => (
                    <li
                      key={row.projectPaint.paintId}
                      className="group flex items-center gap-3 rounded-lg border border-workshop-border p-2 text-sm"
                    >
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
                      <button
                        type="button"
                        onClick={() => removeProjectPaint.mutate({ projectId: project.id, paintId: row.projectPaint.paintId })}
                        className="text-xs text-slate-600 opacity-0 hover:text-red-400 group-hover:opacity-100"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                !showAddPaint && <p className="text-xs text-slate-500">No paints recorded for this build yet.</p>
              )}
            </Card>
          </div>
        )}

        {activeTab === "log" && (
          <div className="flex flex-col gap-4">
            {!logFormOpen ? (
              <Button onClick={() => setLogFormOpen(true)} className="self-start">
                + Add progress
              </Button>
            ) : (
              <Card>
                <form onSubmit={handleAddLogEntry} className="flex flex-col gap-3">
                  <Input
                    type="text"
                    value={logTitle}
                    onChange={(e) => setLogTitle(e.target.value)}
                    placeholder="What did you work on?"
                    required
                  />
                  <Textarea
                    value={logDesc}
                    onChange={(e) => setLogDesc(e.target.value)}
                    placeholder="Add details (optional)"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isAddingLog} className="flex-1">
                      {isAddingLog ? "Adding..." : "Add entry"}
                    </Button>
                    <Button type="button" variant="secondary" className="flex-1" onClick={() => setLogFormOpen(false)}>
                      Cancel
                    </Button>
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
              <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-workshop-border p-8">
                <label className="flex cursor-pointer flex-col items-center gap-2">
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
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" onClick={handleUploadPhoto} disabled={isUploadingPhoto}>
                      {isUploadingPhoto ? "Uploading..." : "Upload"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setPhotoFile(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {project.photos && project.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {project.photos.map((photo) => (
                  <div key={photo.id} className="group relative overflow-hidden rounded-xl border border-workshop-border">
                    <img
                      src={`/uploads/${photo.filename}`}
                      alt={photo.originalFilename || "Project photo"}
                      className="h-32 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Delete this photo?")) {
                          deletePhoto.mutate({ projectId: project.id, photoId: photo.id });
                        }
                      }}
                      className="absolute right-1.5 top-1.5 rounded-lg bg-black/60 px-2 py-1 text-xs text-slate-200 opacity-0 transition-opacity hover:bg-red-900/80 group-hover:opacity-100"
                    >
                      Delete
                    </button>
                    {photo.caption && (
                      <div className="bg-workshop-panelmuted p-2 text-xs text-slate-300">{photo.caption}</div>
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
