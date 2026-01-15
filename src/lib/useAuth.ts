"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setUser(null);
          return;
        }
        const data = (await res.json()) as { user: User | null };

        if (!data.user) {
          await fetch("/api/auth/refresh", { method: "POST" });
          const res2 = await fetch("/api/auth/me", { cache: "no-store" });
          if (res2.ok) {
            const data2 = (await res2.json()) as { user: User | null };
            if (!cancelled) setUser(data2.user ?? null);
            return;
          }
        }

        if (!cancelled) setUser(data.user ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  return { user, loading, signOut };
}
