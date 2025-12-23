"use client";

import type { ReactNode } from "react";

export function AppShell(props: {
  title: string;
  subtitle?: string;
  topRight?: ReactNode;
  bottomNav?: ReactNode;
  children: ReactNode;
}) {
  const { title, subtitle, topRight, bottomNav, children } = props;

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-50">
      <header
        className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/80 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-zinc-50 sm:text-lg">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-zinc-300 sm:text-sm">
                {subtitle}
              </p>
            ) : null}
          </div>

          {topRight ? <div className="shrink-0 pt-0.5">{topRight}</div> : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:h-[calc(100dvh-88px)] lg:min-h-0 lg:overflow-hidden lg:pb-6 lg:pt-6">
        {children}
      </main>

      <div className="sm:hidden">{bottomNav}</div>
    </div>
  );
}
