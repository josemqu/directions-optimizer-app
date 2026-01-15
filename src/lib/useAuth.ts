"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? true;
    if (!silent) setLoading(true);

    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = (await res.json()) as { user: User | null };

      if (!data.user) {
        await fetch("/api/auth/refresh", { method: "POST" });
        const res2 = await fetch("/api/auth/me", { cache: "no-store" });
        if (res2.ok) {
          const data2 = (await res2.json()) as { user: User | null };
          setUser(data2.user ?? null);
          return;
        }
      }

      setUser(data.user ?? null);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (cancelled) return;
        await refresh({ silent: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    const onAuthChanged = () => {
      if (cancelled) return;
      void refresh({ silent: true });
    };

    window.addEventListener("auth-changed", onAuthChanged);

    return () => {
      window.removeEventListener("auth-changed", onAuthChanged);
      cancelled = true;
    };
  }, []);

  const signOut = async () => {
    setUser(null);
    await fetch("/api/auth/logout", { method: "POST" });
    window.dispatchEvent(new Event("auth-changed"));
  };

  return { user, loading, signOut, refresh };
}
