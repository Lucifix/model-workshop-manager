import { useState } from "react";
import {
  useImportManufacturers,
  useImportPaints,
  useImportModels,
  useExportData,
  useBackups,
  useCreateBackup,
  useDeleteBackup,
  useRestoreBackup,
  useUploadBackup,
  useSeedCommunityPaints,
  ImportResult,
  SeedCommunityPaintsResult,
} from "../api/client";
import { Card, Button, Select, PageHeader, LoadingState, EmptyState } from "../components/ui";

type ImportType = "manufacturers" | "paints" | "models";

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function checkHealthUntilReady(): void {
  fetch("/api/health")
    .then((res) => {
      if (res.ok) {
        window.location.reload();
      } else {
        setTimeout(checkHealthUntilReady, 2000);
      }
    })
    .catch(() => setTimeout(checkHealthUntilReady, 2000));
}

function pollUntilHealthy(): void {
  setTimeout(checkHealthUntilReady, 2000);
}

export default function ImportExport() {
  const [activeTab, setActiveTab] = useState<"import" | "export" | "backups">("import");
  const [importType, setImportType] = useState<ImportType>("paints");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [seedResult, setSeedResult] = useState<SeedCommunityPaintsResult | null>(null);
  const [restoringFilename, setRestoringFilename] = useState<string | null>(null);
  const [downloadingFilename, setDownloadingFilename] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const importMfrs = useImportManufacturers();
  const importPaints = useImportPaints();
  const importModels = useImportModels();
  const seedCommunityPaints = useSeedCommunityPaints();
  const exportData = useExportData();
  const backups = useBackups();
  const createBackup = useCreateBackup();
  const deleteBackup = useDeleteBackup();
  const restoreBackup = useRestoreBackup();
  const uploadBackup = useUploadBackup();

  const handleCreateBackup = () => {
    setBackupError(null);
    createBackup.mutate();
  };

  const handleDownloadBackup = async (filename: string) => {
    setBackupError(null);
    setDownloadingFilename(filename);
    try {
      // Plain <a href> would make this a navigation request — once the PWA's
      // service worker intercepts a navigation, Chrome stops treating a
      // Content-Disposition: attachment response as a download and renders
      // it as a blank page instead. Fetching it as data and saving via a
      // Blob + synthetic click (same pattern as the JSON export below)
      // sidesteps that entirely.
      const res = await fetch(`/api/backup/${encodeURIComponent(filename)}/download`);
      if (!res.ok) {
        throw new Error("Failed to download backup");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : "Failed to download backup");
    } finally {
      setDownloadingFilename(null);
    }
  };

  const handleDeleteBackup = (filename: string) => {
    setBackupError(null);
    if (!confirm(`Delete backup "${filename}"? This can't be undone.`)) {
      return;
    }
    deleteBackup.mutate(filename, {
      onError: (err) => setBackupError(err.message),
    });
  };

  const handleRestore = (filename: string) => {
    setBackupError(null);
    if (
      !confirm(
        `Restore from "${filename}"?\n\nThis replaces ALL current data — catalog, inventory, builds, and photos — with what's in this backup, and briefly restarts the server. This can't be undone.`,
      )
    ) {
      return;
    }
    setRestoringFilename(filename);
    restoreBackup.mutate(filename, {
      onSuccess: () => pollUntilHealthy(),
      onError: (err) => {
        setRestoringFilename(null);
        setBackupError(err.message);
      },
    });
  };

  const handleUploadBackup = () => {
    if (!uploadFile) {
      return;
    }
    setBackupError(null);
    uploadBackup.mutate(uploadFile, {
      onSuccess: () => setUploadFile(null),
      onError: (err) => setBackupError(err.message),
    });
  };

  const handleSeedCommunityPaints = () => {
    setSeedResult(null);
    seedCommunityPaints.mutate(undefined, {
      onSuccess: (result) => setSeedResult(result),
    });
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      return;
    }

    const mutationMap = {
      manufacturers: importMfrs,
      paints: importPaints,
      models: importModels,
    };

    mutationMap[importType].mutate(selectedFile, {
      onSuccess: (result) => {
        setImportResult(result);
        setSelectedFile(null);
      },
    });
  };

  const handleExport = async (type: "paints" | "models" | "manufacturers" | "all") => {
    exportData.mutate(type, {
      onSuccess: (data) => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `workshop-${type}-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  };

  const isImporting =
    (importType === "manufacturers" && importMfrs.isPending) ||
    (importType === "paints" && importPaints.isPending) ||
    (importType === "models" && importModels.isPending);

  const getSampleCSV = () => {
    const samples: Record<ImportType, string> = {
      manufacturers: `name,slug,website
Revell,revell,https://revell.com
Tamiya,tamiya,https://tamiya.com
AK Interactive,ak-interactive,https://ak-interactive.com`,
      paints: `manufacturerId,productCode,name,type,finish,sizeMl,colorHex,colorFamily,notes
1,05,Revell 05 White,Enamel,Matt,14,#F2F2EE,White,Sample paint
1,09,Revell 09 Anthracite,Enamel,Matt,14,#37393B,Grey,Sample paint
2,XF-1,Tamiya XF-1 Flat Black,Acrylic,Matt,10,#0A0A0A,Black,Sample paint`,
      models: `manufacturerId,kitNumber,name,scale,category,difficulty,partCount,description,imageUrl,instructionUrl
1,05239,Smit Houston,1:200,Ship,Intermediate,200,Ocean-going tug,https://example.com/05239.jpg,
1,05240,Another Ship,1:400,Ship,Beginner,150,Sample model,,
2,TAM1234,Tamiya Model,1:72,Aircraft,Advanced,500,Fighter aircraft,,`,
    };
    return samples[importType];
  };

  const tabs = [
    { id: "import" as const, label: "Import Data" },
    { id: "export" as const, label: "Export Data" },
    { id: "backups" as const, label: "Backups" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Import & Export"
        description="Bring catalog data in, or take it out as a backup."
      />

      <div className="border-b border-workshop-border">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
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

      {activeTab === "import" && (
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-2 text-lg font-semibold text-slate-100">Starter paint catalog</h2>
            <p className="mb-4 text-sm text-slate-400">
              New here and the paint list is empty? Pull in the MIT-licensed community dataset from{" "}
              <a
                href="https://github.com/Arcturus5404/miniature-paints"
                target="_blank"
                rel="noreferrer"
                className="text-workshop-accent hover:underline"
              >
                Arcturus5404/miniature-paints
              </a>{" "}
              — manufacturers, paint names, and colors for most major brands. Safe to run more than
              once; already-imported paints are skipped.
            </p>
            <Button
              onClick={handleSeedCommunityPaints}
              disabled={seedCommunityPaints.isPending}
              className="self-start"
            >
              {seedCommunityPaints.isPending
                ? "Importing… this can take a minute"
                : "Import starter catalog"}
            </Button>

            {seedResult && (
              <div className="mt-6 space-y-3 border-t border-workshop-border pt-6">
                <h3 className="font-semibold text-slate-100">Import Results</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-emerald-500/15 p-3">
                    <div className="text-2xl font-bold text-emerald-400">
                      {seedResult.paintsImported}
                    </div>
                    <div className="text-xs text-emerald-300">Paints imported</div>
                  </div>
                  <div className="rounded-lg bg-amber-500/15 p-3">
                    <div className="text-2xl font-bold text-amber-400">
                      {seedResult.paintsSkipped}
                    </div>
                    <div className="text-xs text-amber-300">Skipped</div>
                  </div>
                  <div className="rounded-lg bg-red-500/15 p-3">
                    <div className="text-2xl font-bold text-red-400">
                      {seedResult.errors.length}
                    </div>
                    <div className="text-xs text-red-300">Errors</div>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {seedResult.manufacturersCreated} new manufacturer(s) added.
                </p>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold text-slate-100">Import CSV or JSON</h2>
            <form onSubmit={handleImport} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Data type</label>
                <Select
                  value={importType}
                  onChange={(e) => {
                    setImportType(e.target.value as ImportType);
                    setImportResult(null);
                  }}
                >
                  <option value="manufacturers">Manufacturers</option>
                  <option value="paints">Paints</option>
                  <option value="models">Models</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Select file (CSV or JSON)
                </label>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={(e) => {
                    setSelectedFile(e.target.files?.[0] ?? null);
                    setImportResult(null);
                  }}
                  className="w-full rounded-lg border border-workshop-border bg-workshop-panelmuted px-3 py-2 text-sm text-slate-300 outline-hidden file:mr-3 file:rounded-md file:border-0 file:bg-workshop-accent file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-workshop-accentmuted"
                />
                {selectedFile && (
                  <p className="mt-2 text-xs text-slate-400">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              <Button type="submit" disabled={!selectedFile || isImporting} className="self-start">
                {isImporting ? "Importing..." : "Import"}
              </Button>
            </form>

            {importResult && (
              <div className="mt-6 space-y-3 border-t border-workshop-border pt-6">
                <h3 className="font-semibold text-slate-100">Import Results</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-emerald-500/15 p-3">
                    <div className="text-2xl font-bold text-emerald-400">
                      {importResult.imported}
                    </div>
                    <div className="text-xs text-emerald-300">Imported</div>
                  </div>
                  <div className="rounded-lg bg-amber-500/15 p-3">
                    <div className="text-2xl font-bold text-amber-400">{importResult.skipped}</div>
                    <div className="text-xs text-amber-300">Skipped</div>
                  </div>
                  <div className="rounded-lg bg-red-500/15 p-3">
                    <div className="text-2xl font-bold text-red-400">
                      {importResult.errors.length}
                    </div>
                    <div className="text-xs text-red-300">Errors</div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="mb-2 text-sm font-medium text-slate-300">Errors</h4>
                    <ul className="space-y-1 text-xs text-slate-400">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>
                          Row {err.row}: {err.error}
                        </li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>... and {importResult.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="mb-3 font-semibold text-slate-100">
              Sample {importType.slice(0, -1)} CSV
            </h3>
            <pre className="overflow-x-auto rounded-lg bg-workshop-panelmuted p-3 text-xs text-slate-300">
              {getSampleCSV()}
            </pre>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => {
                const csv = getSampleCSV();
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `sample-${importType}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download template
            </Button>
          </Card>
        </div>
      )}

      {activeTab === "export" && (
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-slate-100">Export Catalog Data</h2>
            <p className="mb-6 text-sm text-slate-400">
              Export your catalog data as JSON for backup, sharing, or migration to another
              instance.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleExport("manufacturers")}
                disabled={exportData.isPending}
                className="flex w-full items-center justify-between rounded-lg border border-workshop-border p-3 transition-colors hover:bg-slate-800/60"
              >
                <div className="text-left">
                  <div className="font-medium text-slate-100">Manufacturers</div>
                  <div className="text-xs text-slate-400">All manufacturer records</div>
                </div>
                <span className="text-xs text-slate-500">JSON</span>
              </button>

              <button
                onClick={() => handleExport("paints")}
                disabled={exportData.isPending}
                className="flex w-full items-center justify-between rounded-lg border border-workshop-border p-3 transition-colors hover:bg-slate-800/60"
              >
                <div className="text-left">
                  <div className="font-medium text-slate-100">Paints</div>
                  <div className="text-xs text-slate-400">All paint records</div>
                </div>
                <span className="text-xs text-slate-500">JSON</span>
              </button>

              <button
                onClick={() => handleExport("models")}
                disabled={exportData.isPending}
                className="flex w-full items-center justify-between rounded-lg border border-workshop-border p-3 transition-colors hover:bg-slate-800/60"
              >
                <div className="text-left">
                  <div className="font-medium text-slate-100">Models</div>
                  <div className="text-xs text-slate-400">All model kit records</div>
                </div>
                <span className="text-xs text-slate-500">JSON</span>
              </button>

              <button
                onClick={() => handleExport("all")}
                disabled={exportData.isPending}
                className="flex w-full items-center justify-between rounded-lg border border-workshop-accent bg-workshop-accent/10 p-3 transition-colors hover:bg-workshop-accent/20"
              >
                <div className="text-left">
                  <div className="font-medium text-workshop-accent">Complete Export</div>
                  <div className="text-xs text-slate-400">All catalog data at once</div>
                </div>
                <span className="text-xs text-workshop-accent">JSON</span>
              </button>
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 font-semibold text-slate-100">About data formats</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <strong className="text-slate-300">CSV Format:</strong> Comma-separated values with
                headers. Easy to edit in spreadsheets.
              </li>
              <li>
                <strong className="text-slate-300">JSON Format:</strong> Structured data format.
                Ideal for backups and data transfer.
              </li>
              <li>
                <strong className="text-slate-300">Duplicates:</strong> The import system skips
                records that already exist (based on unique keys).
              </li>
            </ul>
          </Card>
        </div>
      )}

      {activeTab === "backups" && (
        <div className="flex flex-col gap-4">
          {restoringFilename && (
            <Card className="border-workshop-accent/50 bg-workshop-accent/10">
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-workshop-accent/40 border-t-workshop-accent" />
                <p className="text-sm text-slate-200">
                  Restoring from <strong>{restoringFilename}</strong> — the server is restarting and
                  will reconnect automatically. This page will reload once it's back.
                </p>
              </div>
            </Card>
          )}

          {backupError && (
            <Card className="border-red-500/40 bg-red-950/30">
              <p className="text-sm text-red-300">{backupError}</p>
            </Card>
          )}

          <Card>
            <h2 className="mb-2 text-lg font-semibold text-slate-100">Upload a backup file</h2>
            <p className="mb-4 text-sm text-slate-400">
              Restoring on a new server, or bringing back a backup you downloaded earlier? Upload
              its <code className="text-slate-300">.tar.gz</code> file here — it's validated and
              added to the list below, where you can then restore it.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".tar.gz,application/gzip"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="rounded-lg border border-workshop-border bg-workshop-panelmuted px-3 py-2 text-sm text-slate-300 outline-hidden file:mr-3 file:rounded-md file:border-0 file:bg-workshop-accent file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-workshop-accentmuted"
              />
              <Button
                onClick={handleUploadBackup}
                disabled={!uploadFile || uploadBackup.isPending || !!restoringFilename}
              >
                {uploadBackup.isPending ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Backups</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Full snapshots of everything — catalog, inventory, builds, and photos. Includes
                  both nightly automatic backups and any you create here.
                </p>
              </div>
              <Button
                onClick={handleCreateBackup}
                disabled={createBackup.isPending || !!restoringFilename}
              >
                {createBackup.isPending ? "Creating…" : "Create backup now"}
              </Button>
            </div>

            {backups.isLoading && <LoadingState />}
            {backups.isError && <p className="text-sm text-red-400">Failed to load backups.</p>}
            {backups.data && backups.data.length === 0 && (
              <EmptyState message="No backups yet — create one above, or wait for tonight's automatic backup." />
            )}
            {backups.data && backups.data.length > 0 && (
              <ul className="divide-y divide-workshop-border">
                {backups.data.map((backup) => (
                  <li
                    key={backup.filename}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-100">{backup.filename}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(backup.createdAt).toLocaleString()} ·{" "}
                        {formatBytes(backup.sizeBytes)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadBackup(backup.filename)}
                        disabled={downloadingFilename === backup.filename}
                      >
                        {downloadingFilename === backup.filename ? "Downloading…" : "Download"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(backup.filename)}
                        disabled={!!restoringFilename}
                      >
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:bg-red-950/40 hover:text-red-300"
                        onClick={() => handleDeleteBackup(backup.filename)}
                        disabled={deleteBackup.isPending || !!restoringFilename}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
