import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { setAuthCookies } from "@/lib/authCookies";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    password?: string;
    fullName?: string;
  } | null;

  const email = body?.email?.trim();
  const password = body?.password;

  if (!email || !password) {
    return new NextResponse("Missing email/password", { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: body?.fullName,
      },
    },
  });

  if (error) {
    return new NextResponse(error.message || "Signup failed", { status: 400 });
  }

  if (data.session) {
    await setAuthCookies({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    });
  }

  return NextResponse.json({
    user: data.user,
    session: data.session ? { present: true } : { present: false },
  });
}
