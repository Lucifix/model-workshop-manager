import { useState } from "react";
import { useLogin } from "../api/client";
import { Button, Input, FieldLabel } from "../components/ui";
import { HammerIcon } from "../components/icons";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ username, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-workshop-accent text-white">
            <HammerIcon className="h-6 w-6" />
          </span>
          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-50">Workshop Manager</h1>
            <p className="text-sm text-slate-400">Sign in to continue.</p>
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
              autoComplete="current-password"
              required
            />
          </div>
          {login.isError && <p className="text-sm text-red-400">{login.error.message}</p>}
          <Button type="submit" disabled={login.isPending} className="mt-1">
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
