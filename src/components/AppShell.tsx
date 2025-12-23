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
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header
        className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                {subtitle}
              </p>
            ) : null}
          </div>

          {topRight ? <div className="shrink-0 pt-0.5">{topRight}</div> : null}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 min-h-0 flex-col overflow-hidden px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-6 lg:pt-6">
        {children}
      </main>

      <div className="sm:hidden">{bottomNav}</div>
    </div>
  );
}
