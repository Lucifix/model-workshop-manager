import { useState, useEffect } from "react";
import { useSettings, useUpdateSettings, useChangeCredential } from "../api/client";
import { CURRENCIES } from "../lib/currency";
import {
  Card,
  Button,
  Input,
  Select,
  FieldLabel,
  PageHeader,
  LoadingState,
} from "../components/ui";

function AccountCard() {
  const changeCredential = useChangeCredential();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    changeCredential.mutate({
      currentPassword,
      newUsername: newUsername || undefined,
      newPassword: newPassword || undefined,
    });
  };

  return (
    <Card className="max-w-sm">
      <FieldLabel>Account</FieldLabel>
      <p className="mb-3 text-xs text-slate-400">
        Change your username and/or password. Changing either signs you out of every other browser
        session.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <FieldLabel>Current password</FieldLabel>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <div>
          <FieldLabel>New username (optional)</FieldLabel>
          <Input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div>
          <FieldLabel>New password (optional)</FieldLabel>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
          />
        </div>
        {newPassword && (
          <div>
            <FieldLabel>Confirm new password</FieldLabel>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
            />
          </div>
        )}
        {mismatch && <p className="text-sm text-red-400">New passwords don't match.</p>}
        {changeCredential.isError && (
          <p className="text-sm text-red-400">{changeCredential.error.message}</p>
        )}
        <Button type="submit" disabled={changeCredential.isPending} className="mt-1">
          {changeCredential.isPending ? "Updating…" : "Update account"}
        </Button>
      </form>
    </Card>
  );
}

export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [currency, setCurrency] = useState("USD");
  const [upcItemDbEnabled, setUpcItemDbEnabled] = useState(false);

  useEffect(() => {
    if (settings) {
      setCurrency(settings.currency);
      setUpcItemDbEnabled(settings.upcItemDbEnabled);
    }
  }, [settings]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="App-wide preferences." />

      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <Card className="max-w-sm">
            <FieldLabel>Display currency</FieldLabel>
            <p className="mb-3 text-xs text-slate-400">
              Only changes how prices are formatted — amounts you've already entered aren't
              converted.
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
                aria-label="Save currency"
              >
                Save
              </Button>
            </div>
          </Card>

          <Card className="max-w-sm">
            <FieldLabel>Barcode lookup</FieldLabel>
            <p className="mb-3 text-xs text-slate-400">
              Quick-fills model and paint details from a barcode scan via UPCitemdb's free-tier API
              (generic retail data, not hobby-specific — a convenience only).
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={upcItemDbEnabled}
                onChange={(e) => setUpcItemDbEnabled(e.target.checked)}
                className="h-4 w-4 rounded-sm border-workshop-border accent-workshop-accent"
              />
              Enable barcode lookup
            </label>
            <Button
              onClick={() => updateSettings.mutate({ upcItemDbEnabled })}
              disabled={updateSettings.isPending || upcItemDbEnabled === settings?.upcItemDbEnabled}
              className="mt-3"
              aria-label="Save barcode lookup setting"
            >
              Save
            </Button>
          </Card>

          <AccountCard />
        </>
      )}
    </div>
  );
}
