import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { getSession, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const session = await getSession();
    if (session) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      toast.success("Signed in");
      void navigate({ to: "/" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <img
          src="/golden-fresh-logo.png"
          alt="Golden Fresh"
          className="mx-auto h-14 w-auto object-contain"
        />
        <h1 className="mt-4 font-display text-3xl text-[var(--brand-navy)]">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Staff accounts only. Ask an admin if you need access.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Requisition</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
