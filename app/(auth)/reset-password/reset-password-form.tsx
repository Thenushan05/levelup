"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { resetPassword } from "@/actions/auth";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <SystemPanel className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="label-system-accent text-destructive">SYSTEM ERROR</p>
        <p className="text-sm text-muted-foreground">This reset link is missing its token.</p>
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Request a new link
        </Link>
      </SystemPanel>
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const parsed = resetPasswordSchema.safeParse({
      token,
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    startTransition(async () => {
      const result = await resetPassword(parsed.data);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    });
  }

  if (done) {
    return (
      <SystemPanel variant="success" className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-glow-cyan" />
        <p className="heading-system text-lg">PASSWORD RESET COMPLETE</p>
        <p className="text-sm text-muted-foreground">Redirecting you to login...</p>
      </SystemPanel>
    );
  }

  return (
    <SystemPanel className="space-y-5">
      <div>
        <SystemLabel accent>Account Recovery</SystemLabel>
        <h1 className="heading-system mt-1 text-2xl">Set New Password</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="label-system">
            New Password
          </Label>
          <Input id="password" name="password" type="password" required autoComplete="new-password" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="label-system">
            Confirm Password
          </Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full heading-system tracking-widest">
          {pending ? "SAVING..." : "RESET PASSWORD"}
        </Button>
      </form>
    </SystemPanel>
  );
}
