import { useState, useEffect } from "react";
import { useSettings, useUpdateSettings } from "../api/client";
import { CURRENCIES } from "../lib/currency";
import { Card, Button, Select, FieldLabel, PageHeader, LoadingState } from "../components/ui";

export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    if (settings) {
      setCurrency(settings.currency);
    }
  }, [settings]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="App-wide preferences." />

      {isLoading ? (
        <LoadingState />
      ) : (
        <Card className="max-w-sm">
          <FieldLabel>Display currency</FieldLabel>
          <p className="mb-3 text-xs text-slate-400">
            Only changes how prices are formatted — amounts you've already entered aren't converted.
          </p>
          <div className="flex items-center gap-2">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
            <Button
              onClick={() => updateSettings.mutate({ currency })}
              disabled={updateSettings.isPending || currency === settings?.currency}
            >
              Save
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
