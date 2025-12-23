"use client";

import type { ReactNode } from "react";

export type BottomNavItem<T extends string> = {
  key: T;
  label: string;
  icon: ReactNode;
};

export function BottomNav<T extends string>(props: {
  items: BottomNavItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
}) {
  const { items, activeKey, onChange } = props;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-zinc-950/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegación"
    >
      <div className="mx-auto flex w-full max-w-6xl items-stretch px-2">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={
                "flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-md text-xs font-medium " +
                (active
                  ? "text-zinc-950 dark:text-white"
                  : "text-zinc-500 hover:bg-black/5 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200")
              }
              aria-current={active ? "page" : undefined}
            >
              <span
                className={
                  "inline-flex h-9 w-9 items-center justify-center rounded-full " +
                  (active ? "bg-black/10 dark:bg-white/10" : "bg-transparent")
                }
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
