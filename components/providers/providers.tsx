"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register";
import { InstallPrompt } from "@/components/providers/install-prompt";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ServiceWorkerRegister />
      {children}
      <InstallPrompt />
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          classNames: {
            toast:
              "system-panel !bg-card !text-card-foreground !border font-sans",
            title: "heading-system text-sm tracking-wide",
            description: "text-muted-foreground text-xs",
          },
        }}
      />
    </SessionProvider>
  );
}
