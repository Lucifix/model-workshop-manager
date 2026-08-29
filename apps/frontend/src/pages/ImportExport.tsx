import { useState } from "react";
import { useImportManufacturers, useImportPaints, useImportModels, useExportData, ImportResult } from "../api/client";
import { Card, Button, Select, PageHeader } from "../components/ui";

type ImportType = "manufacturers" | "paints" | "models";

export default function ImportExport() {
  const [activeTab, setActiveTab] = useState<"import" | "export">("import");
  const [importType, setImportType] = useState<ImportType>("paints");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const importMfrs = useImportManufacturers();
  const importPaints = useImportPaints();
  const importModels = useImportModels();
  const exportData = useExportData();

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

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
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Import & Export" description="Bring catalog data in, or take it out as a backup." />

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
                <label className="block text-sm font-medium text-slate-300 mb-2">Select file (CSV or JSON)</label>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={(e) => {
                    setSelectedFile(e.target.files?.[0] ?? null);
                    setImportResult(null);
                  }}
                  className="w-full rounded-lg border border-workshop-border bg-workshop-panelmuted px-3 py-2 text-sm text-slate-300 outline-none file:mr-3 file:rounded-md file:border-0 file:bg-workshop-accent file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-workshop-accentmuted"
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
                    <div className="text-2xl font-bold text-emerald-400">{importResult.imported}</div>
                    <div className="text-xs text-emerald-300">Imported</div>
                  </div>
                  <div className="rounded-lg bg-amber-500/15 p-3">
                    <div className="text-2xl font-bold text-amber-400">{importResult.skipped}</div>
                    <div className="text-xs text-amber-300">Skipped</div>
                  </div>
                  <div className="rounded-lg bg-red-500/15 p-3">
                    <div className="text-2xl font-bold text-red-400">{importResult.errors.length}</div>
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
            <h3 className="mb-3 font-semibold text-slate-100">Sample {importType.slice(0, -1)} CSV</h3>
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
              Export your catalog data as JSON for backup, sharing, or migration to another instance.
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
                <strong className="text-slate-300">CSV Format:</strong> Comma-separated values with headers. Easy to edit in spreadsheets.
              </li>
              <li>
                <strong className="text-slate-300">JSON Format:</strong> Structured data format. Ideal for backups and data transfer.
              </li>
              <li>
                <strong className="text-slate-300">Duplicates:</strong> The import system skips records that already exist (based on unique keys).
              </li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
