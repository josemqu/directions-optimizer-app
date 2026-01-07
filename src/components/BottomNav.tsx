"use client";

import type { ReactNode } from "react";
import { Tooltip } from "@/components/Tooltip";

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
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/80 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegación"
    >
      <div className="mx-auto flex w-full max-w-6xl items-stretch px-2">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Tooltip
              key={item.key}
              content={item.label}
              side="top"
              className="flex-1"
            >
              <button
                type="button"
                onClick={() => onChange(item.key)}
                data-tour={`bottom-nav-${String(item.key)}`}
                className={
                  "flex h-14 w-full flex-col items-center justify-center gap-1 rounded-md text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                  (active
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground")
                }
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={
                    "inline-flex h-9 w-9 items-center justify-center rounded-full " +
                    (active ? "bg-muted" : "bg-transparent")
                  }
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            </Tooltip>
          );
        })}
      </div>
    </nav>
  );
}
