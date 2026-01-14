"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { useState } from "react";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
      >
        <UserIcon className="h-5 w-5" />
      </button>

      {open && (
        <>
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setOpen(false)}
          />
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
