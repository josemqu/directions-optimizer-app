import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  getRefreshTokenFromCookies,
} from "@/lib/supabaseServer";
import { setAuthCookies, clearAuthCookies } from "@/lib/authCookies";

export async function POST() {
  const refreshToken = await getRefreshTokenFromCookies();
  if (!refreshToken) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    await clearAuthCookies();
    return new NextResponse(error?.message || "Refresh failed", {
      status: 401,
    });
  }

  await setAuthCookies({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
  });

  return NextResponse.json({
    user: data.user ?? null,
  });
}
