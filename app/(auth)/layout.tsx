import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-1.5 text-center">
        <span className="font-heading text-3xl font-bold tracking-[0.3em] text-glow-cyan">ASCEND</span>
        <span className="label-system">Level Up Your Training</span>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
