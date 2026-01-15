"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";

export function UserMenu(props: { user: User; signOut: () => Promise<void> }) {
  const { user, signOut } = props;
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const getInitials = () => {
    const name = user.user_metadata?.full_name || user.email || "";
    if (name.includes("@")) {
      return name.slice(0, 2).toUpperCase();
    }
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-opacity border border-primary/20"
      >
        {getInitials()}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-popover p-1 shadow-md z-40 animate-in fade-in zoom-in duration-100">
            <div className="px-2 py-1.5 text-sm font-medium border-b border-border mb-1">
              <p className="truncate text-foreground">
                {user.user_metadata.full_name || user.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            <button
              onClick={() => {
                signOut();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}
