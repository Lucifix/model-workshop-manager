import { useParams, useNavigate } from "react-router-dom";
import { useModelDetail, useAddModelToInventory, useCreateProject } from "../api/client";
import { Card, LoadingState, ErrorState, Badge } from "../components/ui";
import { useState } from "react";

export default function ModelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCreateBuildForm, setShowCreateBuildForm] = useState(false);
  const [formData, setFormData] = useState({
    quantity: 1,
    condition: "",
    storageLocation: "",
    notes: "",
  });
  const [buildFormData, setBuildFormData] = useState({
    name: "",
    status: "Planned",
    notes: "",
  });

  const { data: model, isLoading, isError } = useModelDetail(Number(id));
  const { mutate: addToInventory, isPending } = useAddModelToInventory();
  const { mutate: createProject, isPending: isCreatingProject } = useCreateProject();

  if (!id || isNaN(Number(id))) {
    return <ErrorState message="Invalid model ID." />;
  }

  if (isLoading) return <LoadingState />;
  if (isError || !model) return <ErrorState message="Could not load model." />;

  const handleAddToInventory = (e: React.FormEvent) => {
    e.preventDefault();
    addToInventory(
      {
        modelId: model.id,
        quantity: formData.quantity || 1,
        condition: formData.condition || undefined,
        storageLocation: formData.storageLocation || undefined,
        notes: formData.notes || undefined,
      },
      {
        onSuccess: () => {
          setShowAddForm(false);
          setFormData({ quantity: 1, condition: "", storageLocation: "", notes: "" });
        },
      }
    );
  };

  const handleCreateBuild = (e: React.FormEvent) => {
    e.preventDefault();
    createProject(
      {
        modelId: model.id,
        name: buildFormData.name || `${model.name} Build`,
        status: buildFormData.status || "Planned",
        notes: buildFormData.notes || undefined,
      },
      {
        onSuccess: (result) => {
          setShowCreateBuildForm(false);
          setBuildFormData({ name: "", status: "Planned", notes: "" });
          navigate(`/projects/${result.id}`);
        },
      }
    );
  };

  const isInInventory = model.ownership && model.ownership.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate("/models")}
        className="mb-2 text-sm text-slate-400 hover:text-slate-100"
      >
        ← Back to models
      </button>

      <Card className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        {model.imageUrl && (
          <img
            src={model.imageUrl}
            alt={model.name}
            className="h-48 w-full rounded object-cover lg:h-64 lg:w-64 lg:flex-shrink-0"
          />
        )}
        <div className="flex-1">
          <div className="mb-4">
            <h1 className="mb-2 text-2xl font-bold text-slate-100">{model.name}</h1>
            <div className="flex flex-wrap gap-2">
              {model.scale && <Badge variant="secondary">{model.scale}</Badge>}
              {model.category && <Badge variant="secondary">{model.category}</Badge>}
              {model.difficulty && <Badge variant="secondary">{model.difficulty}</Badge>}
            </div>
          </div>

          <div className="mb-4 space-y-2 text-sm">
            <p>
              <span className="font-medium text-slate-300">Manufacturer:</span>{" "}
              <span className="text-slate-400">Manufacturer ID {model.manufacturerId}</span>
            </p>
            <p>
              <span className="font-medium text-slate-300">Kit Number:</span>{" "}
              <span className="text-slate-400">{model.kitNumber}</span>
            </p>
            {model.partCount && (
              <p>
                <span className="font-medium text-slate-300">Part Count:</span>{" "}
                <span className="text-slate-400">{model.partCount}</span>
              </p>
            )}
            {model.description && (
              <p>
                <span className="font-medium text-slate-300">Description:</span>{" "}
                <span className="text-slate-400">{model.description}</span>
              </p>
            )}
          </div>

          <div className="flex gap-3">
            {!showAddForm && !showCreateBuildForm && (
              <>
                {!isInInventory ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="rounded bg-workshop-accent px-4 py-2 text-sm font-medium text-white hover:bg-workshop-accent/90"
                  >
                    Add to my models
                  </button>
                ) : (
                  <div className="text-sm text-emerald-400">✓ In your inventory</div>
                )}
                <button
                  onClick={() => setShowCreateBuildForm(true)}
                  className="rounded border border-workshop-accent px-4 py-2 text-sm font-medium text-workshop-accent hover:bg-workshop-accent/10"
                >
                  Create build
                </button>
              </>
            )}

            {showAddForm && (
              <form onSubmit={handleAddToInventory} className="w-full flex flex-col gap-3">
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  placeholder="Quantity"
                  className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
                />
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
                >
                  <option value="">Condition (optional)</option>
                  <option value="unbuilt">Unbuilt</option>
                  <option value="built">Built</option>
                  <option value="damaged">Damaged</option>
                </select>
                <input
                  type="text"
                  value={formData.storageLocation}
                  onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                  placeholder="Storage location"
                  className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
                />
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes"
                  rows={2}
                  className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 rounded bg-workshop-accent px-3 py-2 text-sm font-medium text-white hover:bg-workshop-accent/90 disabled:opacity-50"
                  >
                    {isPending ? "Adding..." : "Add"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 rounded border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {showCreateBuildForm && (
              <form onSubmit={handleCreateBuild} className="w-full flex flex-col gap-3">
                <input
                  type="text"
                  value={buildFormData.name}
                  onChange={(e) => setBuildFormData({ ...buildFormData, name: e.target.value })}
                  placeholder={`${model.name} Build`}
                  className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
                />
                <select
                  value={buildFormData.status}
                  onChange={(e) => setBuildFormData({ ...buildFormData, status: e.target.value })}
                  className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
                >
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                  <option value="Abandoned">Abandoned</option>
                </select>
                <textarea
                  value={buildFormData.notes}
                  onChange={(e) => setBuildFormData({ ...buildFormData, notes: e.target.value })}
                  placeholder="Notes (optional)"
                  rows={2}
                  className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isCreatingProject}
                    className="flex-1 rounded bg-workshop-accent px-3 py-2 text-sm font-medium text-white hover:bg-workshop-accent/90 disabled:opacity-50"
                  >
                    {isCreatingProject ? "Creating..." : "Create Build"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateBuildForm(false)}
                    className="flex-1 rounded border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-slate-300">Paint Requirements</h2>
        {model.requiredPaints && model.requiredPaints.length > 0 ? (
          <>
            <div className="mb-4 text-xs text-slate-400">
              {model.availability.ownedCount} / {model.availability.totalRequired} owned ({model.availability.coveragePercent}%)
            </div>
            <ul className="space-y-2">
              {model.requiredPaints.map((paint) => (
                <li
                  key={paint.id}
                  className="flex items-center gap-3 rounded border border-slate-700 p-2 text-sm"
                >
                  {paint.owned && <span className="text-green-400">✓</span>}
                  {!paint.owned && <span className="text-slate-600">○</span>}
                  <span
                    className="h-5 w-5 rounded-full border border-slate-600 flex-shrink-0"
                    style={{ backgroundColor: paint.colorHex ?? "#334155" }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-100">{paint.name}</div>
                    <div className="text-xs text-slate-500">
                      {paint.productCode} · {paint.type}
                      {paint.finish ? ` · ${paint.finish}` : ""}
                      {paint.usage ? ` · Usage: ${paint.usage}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="text-xs text-slate-500">No paint requirements recorded.</div>
        )}
      </Card>

      {model.projects && model.projects.length > 0 && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-300">Build History</h2>
          <ul className="space-y-2">
            {model.projects.map((project) => (
              <li key={project.id} className="flex items-center justify-between rounded border border-slate-700 p-2 text-sm">
                <div>
                  <div className="font-medium text-slate-100">{project.name}</div>
                  <div className="text-xs text-slate-500">{project.status}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-slate-300">{project.progressPercent}%</div>
                  <div className="h-1 w-16 rounded-full bg-slate-700 mt-1">
                    <div
                      className="h-full rounded-full bg-workshop-accent"
                      style={{ width: `${project.progressPercent}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
