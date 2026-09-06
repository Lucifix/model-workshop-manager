import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useModels, useModelDetail, useCreateProject, useAddModelToInventory } from "../api/client";
import { AddModelForm } from "../components/AddModelForm";
import {
  Card,
  Button,
  Input,
  Select,
  Textarea,
  FieldLabel,
  PageHeader,
  LoadingState,
} from "../components/ui";
import { BoxIcon } from "../components/icons";

interface SelectedModel {
  id: number;
  name: string;
  kitNumber: string;
}

export default function ProjectNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectId = searchParams.get("modelId");

  const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(null);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: preselect, isLoading: preselectLoading } = useModelDetail(
    preselectId ? Number(preselectId) : NaN,
  );
  useEffect(() => {
    if (preselect && !selectedModel) {
      setSelectedModel({ id: preselect.id, name: preselect.name, kitNumber: preselect.kitNumber });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect]);

  const { data: results, isLoading: searchLoading } = useModels(search);

  const [name, setName] = useState("");
  const [status, setStatus] = useState("Planned");
  const [notes, setNotes] = useState("");
  const [ownIt, setOwnIt] = useState(true);

  const createProject = useCreateProject();
  const addToInventory = useAddModelToInventory();

  const handleStartBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel) {
      return;
    }
    const project = await createProject.mutateAsync({
      modelId: selectedModel.id,
      name: name.trim() || `${selectedModel.name} Build`,
      status,
      notes: notes || undefined,
    });
    if (ownIt) {
      await addToInventory.mutateAsync({ modelId: selectedModel.id });
    }
    navigate(`/projects/${project.id}`);
  };

  if (preselectId && preselectLoading) {
    return <LoadingState />;
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New Build"
        description="Pick a model — or add a new one — then start the build."
      />

      {!selectedModel ? (
        <>
          {!showAddForm ? (
            <>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your catalog (name or kit number)…"
                autoFocus
              />

              {searchLoading && <p className="text-sm text-slate-500">Searching…</p>}

              {results && results.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {results.map((row) => (
                    <Card
                      key={row.model.id}
                      className="flex cursor-pointer items-center gap-3 transition-all hover:border-workshop-accent hover:bg-slate-800/60"
                      onClick={() =>
                        setSelectedModel({
                          id: row.model.id,
                          name: row.model.name,
                          kitNumber: row.model.kitNumber,
                        })
                      }
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-workshop-accent/15 text-workshop-accent">
                        <BoxIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-slate-100">{row.model.name}</div>
                        <div className="text-xs text-slate-400">
                          {row.manufacturer?.name} · {row.model.kitNumber}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {results && results.length === 0 && !searchLoading && (
                <p className="text-sm text-slate-500">
                  {search
                    ? "No matches in your catalog."
                    : "Start typing to search, or add a new model below."}
                </p>
              )}

              <Button
                variant="secondary"
                className="self-start"
                onClick={() => setShowAddForm(true)}
              >
                Can't find it? + Add a new model
              </Button>
            </>
          ) : (
            <AddModelForm
              onCreated={(model) => setSelectedModel(model)}
              onCancel={() => setShowAddForm(false)}
            />
          )}
        </>
      ) : (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Building</div>
              <div className="font-semibold text-slate-100">
                {selectedModel.name}{" "}
                <span className="text-slate-500">({selectedModel.kitNumber})</span>
              </div>
            </div>
            <button
              type="button"
              className="text-xs text-slate-400 hover:text-slate-200"
              onClick={() => setSelectedModel(null)}
            >
              Change model
            </button>
          </div>

          <form onSubmit={handleStartBuild} className="flex flex-col gap-3">
            <div>
              <FieldLabel>Build name</FieldLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`${selectedModel.name} Build`}
              />
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Abandoned">Abandoned</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Notes (optional)</FieldLabel>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={ownIt}
                onChange={(e) => setOwnIt(e.target.checked)}
                className="h-4 w-4 rounded-sm border-workshop-border accent-workshop-accent"
              />
              I already own this kit — add it to My Collection too
            </label>

            <Button
              type="submit"
              disabled={createProject.isPending || addToInventory.isPending}
              className="self-start"
            >
              {createProject.isPending ? "Starting…" : "Start build"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
