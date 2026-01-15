import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/supabaseServer";

export async function setAuthCookies(params: {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number | null;
}) {
  const store = await cookies();

  const maxAge =
    typeof params.expiresIn === "number" && params.expiresIn > 0
      ? params.expiresIn
      : undefined;

  store.set(ACCESS_TOKEN_COOKIE, params.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });

  store.set(REFRESH_TOKEN_COOKIE, params.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  store.set(REFRESH_TOKEN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
