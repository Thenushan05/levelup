"use client";

import { useState, useTransition, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { SystemPanel } from "@/components/system/system-panel";
import { SystemLabel, SystemHeading } from "@/components/system/system-label";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateProfile, changePassword } from "@/actions/settings";
import { showSystemToast } from "@/lib/toast-system";
import { BodyStatsForm, type BodyStatsInitial } from "@/components/diet/body-stats-form";

export function SettingsView({
  name,
  email,
  image,
  bodyStats,
}: {
  name: string;
  email: string;
  image: string;
  bodyStats: BodyStatsInitial;
}) {
  const [profilePending, startProfileTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  function handleProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileError(null);
    const fd = new FormData(e.currentTarget);
    startProfileTransition(async () => {
      const result = await updateProfile({
        name: String(fd.get("name") ?? ""),
        image: String(fd.get("image") ?? ""),
      });
      if (!result.success) {
        setProfileError(result.error);
        return;
      }
      showSystemToast("Profile updated");
    });
  }

  function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startPasswordTransition(async () => {
      const result = await changePassword({
        currentPassword: String(fd.get("currentPassword") ?? ""),
        newPassword: String(fd.get("newPassword") ?? ""),
        confirmPassword: String(fd.get("confirmPassword") ?? ""),
      });
      if (!result.success) {
        setPasswordError(result.error);
        return;
      }
      setPasswordSuccess(true);
      form.reset();
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <SystemLabel accent>Settings</SystemLabel>
        <SystemHeading className="mt-1">System Configuration</SystemHeading>
      </div>

      <SystemPanel className="space-y-4">
        <SystemLabel accent>Profile</SystemLabel>
        <form onSubmit={handleProfileSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="label-system">
              Name
            </Label>
            <Input id="name" name="name" defaultValue={name} required maxLength={60} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="label-system">
              Email
            </Label>
            <Input id="email" defaultValue={email} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="image" className="label-system">
              Avatar URL (optional)
            </Label>
            <Input id="image" name="image" defaultValue={image} placeholder="https://..." />
          </div>
          {profileError && <p className="text-sm text-destructive">{profileError}</p>}
          <Button type="submit" disabled={profilePending} className="heading-system tracking-widest">
            {profilePending ? "SAVING..." : "SAVE PROFILE"}
          </Button>
        </form>
      </SystemPanel>

      <SystemPanel className="space-y-4">
        <SystemLabel accent>Body Stats</SystemLabel>
        <p className="text-sm text-muted-foreground">
          Powers the BMI, calorie, and macro calculations on the{" "}
          <a href="/diet" className="text-glow-cyan underline">
            Diet &amp; Body
          </a>{" "}
          page.
        </p>
        <BodyStatsForm initial={bodyStats} />
      </SystemPanel>

      <SystemPanel className="space-y-4">
        <SystemLabel accent>Change Password</SystemLabel>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword" className="label-system">
              Current Password
            </Label>
            <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="label-system">
              New Password
            </Label>
            <Input id="newPassword" name="newPassword" type="password" required autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="label-system">
              Confirm New Password
            </Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
          </div>
          {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          {passwordSuccess && <p className="text-sm text-success">Password updated.</p>}
          <Button type="submit" disabled={passwordPending} className="heading-system tracking-widest">
            {passwordPending ? "SAVING..." : "UPDATE PASSWORD"}
          </Button>
        </form>
      </SystemPanel>

      <SystemPanel className="flex items-center justify-between gap-3">
        <div>
          <SystemLabel accent>Session</SystemLabel>
          <p className="text-sm text-muted-foreground">End your current session.</p>
        </div>
        <Button
          variant="destructive"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="heading-system tracking-widest"
        >
          <LogOut className="h-4 w-4" /> LOGOUT
        </Button>
      </SystemPanel>
    </div>
  );
}
