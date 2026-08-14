"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { registerSchema } from "@/lib/validations/auth";
import { registerUser, verifyRegistrationOtp, resendRegistrationOtp } from "@/actions/auth";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel } from "@/components/system/system-label";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface PendingVerification {
  name: string;
  email: string;
  password: string;
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [initializedName, setInitializedName] = useState<string | null>(null);

  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpPending, startOtpTransition] = useTransition();
  const [resendPending, startResendTransition] = useTransition();
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const parsed = registerSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    startTransition(async () => {
      const result = await registerUser(parsed.data);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setPendingVerification({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      });
    });
  }

  async function completeSignIn(name: string, email: string, password: string) {
    const signInRes = await signIn("credentials", { email, password, redirect: false });
    if (signInRes?.error) {
      setOtpError("Verified, but automatic sign-in failed. Please log in.");
      return;
    }

    setInitializedName(name);
    setTimeout(() => router.push("/onboarding"), 1800);
  }

  function handleVerifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pendingVerification) return;
    setOtpError(null);

    if (otp.trim().length !== 6) {
      setOtpError("Enter the 6-digit code");
      return;
    }

    startOtpTransition(async () => {
      const result = await verifyRegistrationOtp({ email: pendingVerification.email, code: otp.trim() });
      if (!result.success) {
        setOtpError(result.error);
        return;
      }

      await completeSignIn(pendingVerification.name, pendingVerification.email, pendingVerification.password);
    });
  }

  function handleResend() {
    if (!pendingVerification) return;
    setOtpError(null);
    setResendMessage(null);

    startResendTransition(async () => {
      const result = await resendRegistrationOtp({ email: pendingVerification.email });
      if (!result.success) {
        setOtpError(result.error);
        return;
      }
      setResendMessage("A new code is on its way to your inbox.");
    });
  }

  if (initializedName) {
    return (
      <SystemPanel key="success" variant="success" className="py-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-3"
        >
          <p className="label-system-accent tracking-[0.3em]">SYSTEM INITIALIZED</p>
          <p className="heading-system text-xl">PLAYER PROFILE CREATED</p>
          <p className="text-glow-cyan heading-system text-2xl">WELCOME, {initializedName.toUpperCase()}</p>
        </motion.div>
      </SystemPanel>
    );
  }

  if (pendingVerification) {
    return (
      <SystemPanel key="otp-step" className="space-y-5">
        <div>
          <SystemLabel accent>Verify Email</SystemLabel>
          <h1 className="heading-system mt-1 text-2xl">Enter Your Code</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="text-foreground">{pendingVerification.email}</span>. Enter it
            below to activate your account.
          </p>
        </div>
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="otp" className="label-system">
              Verification Code
            </Label>
            <Input
              id="otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-xl tracking-[0.5em]"
              placeholder="000000"
            />
          </div>
          {otpError && <p className="text-sm text-destructive">{otpError}</p>}
          {resendMessage && !otpError && <p className="text-sm text-glow-cyan">{resendMessage}</p>}
          <Button type="submit" disabled={otpPending} className="w-full heading-system tracking-widest">
            {otpPending ? "VERIFYING..." : "VERIFY & CONTINUE"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t get it?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendPending}
            className="text-primary hover:underline disabled:opacity-50"
          >
            {resendPending ? "Sending..." : "Resend code"}
          </button>
        </p>
      </SystemPanel>
    );
  }

  return (
    <SystemPanel key="register-form" className="space-y-5">
      <div>
        <SystemLabel accent>New Player</SystemLabel>
        <h1 className="heading-system mt-1 text-2xl">Register</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="label-system">
            Name
          </Label>
          <Input id="name" name="name" required autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="label-system">
            Email
          </Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="label-system">
            Password
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
          {pending ? "INITIALIZING..." : "CREATE PROFILE"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already a player?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Login
        </Link>
      </p>
    </SystemPanel>
  );
}
