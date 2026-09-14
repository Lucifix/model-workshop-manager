import { useState } from "react";
import { useSetup } from "../api/client";
import { Button, Input, FieldLabel } from "../components/ui";
import { HammerIcon } from "../components/icons";

export default function Setup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const setup = useSetup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    setup.mutate({ username, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-workshop-accent text-white">
            <HammerIcon className="h-6 w-6" />
          </span>
          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-50">Welcome to Workshop Manager</h1>
            <p className="text-sm text-slate-400">Create your login to get started.</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-workshop-border bg-workshop-panel p-6 shadow-panel"
        >
          <div>
            <FieldLabel>Username</FieldLabel>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              required
            />
          </div>
          <div>
            <FieldLabel>Password</FieldLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div>
            <FieldLabel>Confirm password</FieldLabel>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {mismatch && <p className="text-sm text-red-400">Passwords don't match.</p>}
          {setup.isError && <p className="text-sm text-red-400">{setup.error.message}</p>}
          <Button type="submit" disabled={setup.isPending} className="mt-1">
            {setup.isPending ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
