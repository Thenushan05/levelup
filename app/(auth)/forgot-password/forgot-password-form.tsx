"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { requestPasswordReset } from "@/actions/auth";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [resetLink, setResetLink] = useState<string | null | undefined>(undefined);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    startTransition(async () => {
      const result = await requestPasswordReset(parsed.data);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setResetLink(result.resetLink);
    });
  }

  if (resetLink !== undefined) {
    return (
      <SystemPanel className="flex flex-col items-center gap-4 py-8 text-center">
        <KeyRound className="h-8 w-8 text-glow-cyan" />
        <p className="label-system-accent tracking-[0.2em]">REQUEST RECEIVED</p>
        {resetLink ? (
          <>
            <p className="max-w-sm text-sm text-muted-foreground">
              No email provider is configured for this environment, so here is your reset link directly:
            </p>
            <Link href={resetLink} className={cn(buttonVariants(), "w-full heading-system tracking-widest")}>
              OPEN RESET LINK
            </Link>
          </>
        ) : (
          <p className="max-w-sm text-sm text-muted-foreground">
            If an account exists for that email, a reset link has been generated for it.
          </p>
        )}
        <Link href="/login" className="text-sm text-primary hover:underline">
          Back to login
        </Link>
      </SystemPanel>
    );
  }

  return (
    <SystemPanel className="space-y-5">
      <div>
        <SystemLabel accent>Account Recovery</SystemLabel>
        <h1 className="heading-system mt-1 text-2xl">Forgot Password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we&apos;ll generate a reset link.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="label-system">
            Email
          </Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full heading-system tracking-widest">
          {pending ? "SUBMITTING..." : "SEND RESET LINK"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          Back to login
        </Link>
      </p>
    </SystemPanel>
  );
}
